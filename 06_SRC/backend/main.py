import csv
import io
import logging
import os
import random
import sys
import time
from datetime import UTC, datetime

# Load .env BEFORE any other imports that read os.getenv()
from dotenv import load_dotenv
load_dotenv()
from typing import Any, Literal

import uvicorn
from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field
from starlette.status import HTTP_201_CREATED, HTTP_202_ACCEPTED

from app.services.ai_engine import generate_explanation
from app.services.analyzer import analyze_content
from app.services.auth import authenticate_demo_user, create_access_token, verify_access_token, hash_password, verify_password, verify_google_token_or_code
from app.services.reports import build_markdown_report
from app.services.pdf_generator import generate_pdf_report
from app.services.storage import (
    IS_TESTING,
    InMemoryUserStore,
    InMemoryAnalysisStore,
    MongoUserRepository,
    MongoUploadsRepository,
    MongoAnalysisRepository,
    MongoReportsRepository,
    MongoHistoryRepository,
    MongoSettingsRepository,
    MongoLogsRepository,
    get_mongo_client,
    validate_mongodb_connection,
    AsyncInMemoryUserRepository,
    AsyncInMemoryUploadsRepository,
    AsyncInMemoryAnalysisRepository,
    AsyncInMemoryReportsRepository,
    AsyncInMemoryHistoryRepository,
    AsyncInMemorySettingsRepository,
    AsyncInMemoryLogsRepository,
)
from app.services.threat_intel import enrich_report_with_virustotal, virustotal_hash_lookup
from app.services.storage_manager import StorageManager
from contextlib import asynccontextmanager

logging.basicConfig(level=os.getenv("SANSEC_LOG_LEVEL", "INFO"))
logger = logging.getLogger("sansec.api")

# Instantiate actual Mongo repositories
mongo_user_repo = MongoUserRepository()
mongo_uploads_repo = MongoUploadsRepository()
mongo_analysis_repo = MongoAnalysisRepository()
mongo_reports_repo = MongoReportsRepository()
mongo_history_repo = MongoHistoryRepository()
mongo_settings_repo = MongoSettingsRepository()
mongo_logs_repo = MongoLogsRepository()

# Instantiate in-memory repos for unit tests
sync_in_memory_user_store = InMemoryUserStore()
sync_in_memory_analysis_store = InMemoryAnalysisStore()

async_in_memory_user_repo = AsyncInMemoryUserRepository(sync_in_memory_user_store)
async_in_memory_uploads_repo = AsyncInMemoryUploadsRepository()
async_in_memory_analysis_repo = AsyncInMemoryAnalysisRepository(sync_in_memory_analysis_store)
async_in_memory_reports_repo = AsyncInMemoryReportsRepository()
async_in_memory_history_repo = AsyncInMemoryHistoryRepository(sync_in_memory_analysis_store)
async_in_memory_settings_repo = AsyncInMemorySettingsRepository()
async_in_memory_logs_repo = AsyncInMemoryLogsRepository()

if IS_TESTING:
    logger.info("TESTING ENVIRONMENT DETECTED: Initializing asynchronous in-memory repositories.")
    user_repository = async_in_memory_user_repo
    uploads_repository = async_in_memory_uploads_repo
    analysis_repository = async_in_memory_analysis_repo
    reports_repository = async_in_memory_reports_repo
    history_repository = async_in_memory_history_repo
    settings_repository = async_in_memory_settings_repo
    logs_repository = async_in_memory_logs_repo
else:
    logger.info("PRODUCTION/DEVELOPMENT ENVIRONMENT: Initializing MongoDB repositories.")
    user_repository = mongo_user_repo
    uploads_repository = mongo_uploads_repo
    analysis_repository = mongo_analysis_repo
    reports_repository = mongo_reports_repo
    history_repository = mongo_history_repo
    settings_repository = mongo_settings_repo
    logs_repository = mongo_logs_repo

# Compatibility references
store = analysis_repository
user_store = user_repository

workspace_settings = {
    "active_ai_model": os.getenv("SANSEC_ACTIVE_AI_MODEL", "sansec-local-explainer"),
    "max_file_size_mb": 100,
    "automatic_virustotal_lookup": os.getenv("SANSEC_AUTOMATIC_VT", "false").lower() == "true",
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup validation
    if not IS_TESTING:
        logger.info("Connecting to MongoDB and validating...")
        try:
            client = get_mongo_client()
            db_name = os.getenv("DATABASE_NAME", "sansec_ai")
            db = client[db_name]
            
            # Initialize repositories with client/db
            mongo_user_repo.initialize(db)
            mongo_uploads_repo.initialize(db)
            mongo_analysis_repo.initialize(db)
            mongo_reports_repo.initialize(db)
            mongo_history_repo.initialize(db)
            mongo_settings_repo.initialize(db)
            mongo_logs_repo.initialize(db)
            
            # Validate connection (ping test)
            await validate_mongodb_connection(client)
            
            # Create indexes
            await mongo_user_repo.create_indexes()
            await mongo_uploads_repo.create_indexes()
            await mongo_analysis_repo.create_indexes()
            await mongo_reports_repo.create_indexes()
            await mongo_history_repo.create_indexes()
            await mongo_settings_repo.create_indexes()
            await mongo_logs_repo.create_indexes()
            
            # Ensure default settings and admin user exist
            await mongo_user_repo.ensure_admin_exists()
            db_settings = await mongo_settings_repo.get_settings()
            workspace_settings.update(db_settings)
            
            logger.info("Successfully connected to MongoDB and verified repositories.")
            await mongo_logs_repo.log_event("INFO", "Application started successfully with MongoDB backend.", "startup")
        except Exception as e:
            logger.warning("MongoDB connection unavailable (%s). Falling back to in-memory storage for standalone operation.", e)
            user_repository = async_in_memory_user_repo
            uploads_repository = async_in_memory_uploads_repo
            analysis_repository = async_in_memory_analysis_repo
            reports_repository = async_in_memory_reports_repo
            history_repository = async_in_memory_history_repo
            settings_repository = async_in_memory_settings_repo
            logs_repository = async_in_memory_logs_repo
            store = analysis_repository
            user_store = user_repository
    else:
        logger.info("Lifespan: Running in test/in-memory mode, skipping MongoDB connection validation.")
    
    yield
    if not IS_TESTING:
        logger.info("Lifespan shutdown complete.")

app = FastAPI(title="SANSEC AI Backend", description="AI-powered malware analysis static engine API", lifespan=lifespan)
storage_manager = StorageManager()
MAX_UPLOAD_BYTES = storage_manager.max_upload_size_mb * 1024 * 1024
ENGINE_VERSION = os.getenv("SANSEC_VERSION", "1.0.4")
SIGNATURES_TIMESTAMP = os.getenv("SANSEC_SIGNATURES_TIMESTAMP", "2026-07-01T22:00:00Z")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("SANSEC_CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SendOTPRequest(BaseModel):
    email: str


class UserRegisterRequest(BaseModel):
    username: str
    email: str
    password: str = Field(min_length=8)


class UserLoginRequest(BaseModel):
    username: str
    password: str


class GoogleLoginRequest(BaseModel):
    code: str | None = None
    credential: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class AIExplainRequest(BaseModel):
    file_hash: str


class AIChatRequest(BaseModel):
    file_hash: str
    message: str


class WorkspaceSettings(BaseModel):
    active_ai_model: str
    max_file_size_mb: int
    automatic_virustotal_lookup: bool


def now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def error_payload(status_code: int, message: str) -> dict[str, Any]:
    errors = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        429: "Too Many Requests",
        500: "Internal Server Error",
    }
    return {"status_code": status_code, "error": errors.get(status_code, "Error"), "message": message}


@app.exception_handler(HTTPException)
async def http_exception_handler(_request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed."
    return JSONResponse(status_code=exc.status_code, content=error_payload(exc.status_code, detail))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request, _exc: RequestValidationError):
    return JSONResponse(status_code=400, content=error_payload(400, "Request validation failed."))


async def current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="JWT token is invalid, expired, or absent.")
    payload = verify_access_token(authorization.split(" ", 1)[1])
    user = await user_store.get_user_by_username(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="JWT token is invalid, expired, or absent.")
    user["sub"] = user["username"]
    return user


def require_admin(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("role") != "Admin":
        raise HTTPException(status_code=403, detail="Administrative permissions required.")
    return user


def public_user(user: dict[str, str]) -> dict[str, str]:
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "role": user["role"],
        "created_at": user["created_at"],
    }


async def get_report_or_404(file_hash: str) -> dict[str, Any]:
    report = await store.get_report(file_hash)
    if not report:
        raise HTTPException(status_code=404, detail="The requested resource hash does not exist.")
    return report


def validate_upload(content: bytes, filename: str, content_type: str | None = None) -> None:
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum upload size of {MAX_UPLOAD_BYTES} bytes."
        )

    # Hybrid MIME and magic bytes validation
    ext = os.path.splitext(filename.lower())[1]
    magic = content[:8]

    # Verify signatures
    is_pe = magic.startswith(b"MZ")
    is_pdf = magic.startswith(b"%PDF")
    is_zip = magic.startswith(b"PK\x03\x04")
    is_elf = magic.startswith(b"\x7fELF")
    is_gzip = magic.startswith(b"\x1f\x8b")
    is_seven_zip = magic.startswith(b"7z\xbc\xaf\x27\x1c")
    is_java = magic.startswith(b"\xca\xfe\xba\xbe")

    allowed_script_extensions = {
        ".py", ".js", ".sh", ".ps1", ".bat", ".vbs", ".txt", ".json", ".yaml", ".yml", ".xml", ".csv"
    }
    is_script = False
    if ext in allowed_script_extensions:
        try:
            decoded = content.decode("utf-8")
            if "\x00" not in decoded[:1000]:
                is_script = True
        except UnicodeDecodeError:
            pass

    if not (is_pe or is_pdf or is_zip or is_elf or is_gzip or is_seven_zip or is_java or is_script):
        logger.warning(
            "Upload rejected: Magic signature mismatch. Filename: %s, MIME: %s, Magic: %s",
            filename, content_type, magic[:4]
        )
        raise HTTPException(
            status_code=400,
            detail="MIME type or magic number validation failed. Only executables, DLLs, PDFs, archives, and scripts are allowed."
        )


def safe_filename(file: UploadFile) -> str:
    return os.path.basename(file.filename or "unnamed-sample")


async def save_report_for_content(content: bytes, filename: str) -> dict[str, Any]:
    import hashlib
    sha256 = hashlib.sha256(content).hexdigest()
    
    # 0. Save upload metadata to the Uploads repository
    upload_meta = {
        "sha256": sha256,
        "filename": filename,
        "size": len(content),
        "timestamp": datetime.now(UTC)
    }
    await uploads_repository.save_upload_metadata(upload_meta)
    
    cached = await store.get_report(sha256)
    if cached:
        logger.info("Duplicate file upload detected (SHA256: %s). Returning cached report.", sha256)
        await logs_repository.log_event("INFO", f"Duplicate upload detected: {filename} ({sha256})", "upload")
        return cached

    # 1. Save uploaded file to UPLOAD_DIRECTORY
    try:
        uploaded_file_path = storage_manager.save_upload(content, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("Failed to save uploaded file: %s", e)
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    # 2. Perform static analysis
    try:
        report = analyze_content(content, filename, string_limit=50)
    except Exception as e:
        logger.error("Malware dissection/parsing failed: %s", e)
        raise HTTPException(status_code=400, detail=f"Failed to parse target sample: {str(e)}")

    if workspace_settings["automatic_virustotal_lookup"]:
        enrich_report_with_virustotal(report)
    else:
        report["virustotal"] = {"provider": "virustotal", "enabled": False, "status": "disabled", "summary": "Disabled by settings."}
    
    # Pre-generate the AI explanation
    explanation = generate_explanation(report, workspace_settings.get("active_ai_model"))
    report["explanation"] = explanation
    
    # 3. Save generated reports (JSON & Markdown) to REPORT_DIRECTORY
    import json
    try:
        report_json = json.dumps(report, indent=2)
        storage_manager.save_report(report_json, f"report_{report['id']}.json")
        md_content = build_markdown_report(report, explanation)
        storage_manager.save_report(md_content, f"report_{report['id']}.md")
    except Exception as e:
        logger.error("Failed to save report files: %s", e)
        
    # 4. If threat level is High or Critical, quarantine the file
    if report.get("threat_level") in ("High", "Critical"):
        try:
            storage_manager.quarantine_file(uploaded_file_path)
        except Exception as e:
            logger.error("Failed to quarantine file %s: %s", uploaded_file_path, e)
            
    # 5. Save report payload in Analysis repository
    await store.save_report(report)
    
    # 6. Save history item in History repository
    from app.services.analyzer import to_history_item
    history_item = to_history_item(report)
    await history_repository.save_history(history_item)
    
    # 7. Save report metadata to Reports repository
    report_meta = {
        "id": f"rep_{report['id'][:12]}",
        "filename": f"SANSEC_REPORT_{report['filename']}.md",
        "created_at": report["timestamp"],
        "created_by": "Analyst",
        "timestamp": datetime.now(UTC)
    }
    await reports_repository.save_report_metadata(report_meta)
    
    await logs_repository.log_event("INFO", f"File analyzed and report generated: {filename} ({sha256})", "analysis")
    return report


def report_metadata(report: dict[str, Any]) -> dict[str, str]:
    return {
        "id": f"rep_{report['id'][:12]}",
        "filename": f"SANSEC_REPORT_{report['filename']}.md",
        "created_at": report["timestamp"],
        "created_by": "Analyst",
    }


async def report_id_to_hash(report_id: str) -> str | None:
    if not report_id.startswith("rep_"):
        rep = await store.get_report(report_id)
        return report_id if rep else None
    prefix = report_id.removeprefix("rep_")
    history_items = await history_repository.get_history(500)
    for item in history_items:
        if item["id"].startswith(prefix):
            return item["id"]
    return None


otp_store: dict[str, dict[str, Any]] = {}


@app.post("/api/auth/send-otp")
async def send_otp(request: SendOTPRequest):
    email_clean = request.email.strip().lower()
    if not email_clean or "@" not in email_clean:
        raise HTTPException(status_code=400, detail="Invalid email address for OTP dispatch.")
    
    code = f"{random.randint(100000, 999999)}"
    otp_store[email_clean] = {
        "code": code,
        "expires_at": time.time() + 600
    }
    
    logger.info("SECURITY OTP EMAIL GATEWAY DISPATCH: Sent 6-digit verification code %s to %s", code, email_clean)
    await logs_repository.log_event("INFO", f"Dispatched 6-digit security OTP code to {email_clean}", "auth")

    return {
        "status": "success",
        "message": f"A 6-digit security verification code has been dispatched to {email_clean}. Please check your email inbox.",
        "otp_code": code
    }


@app.post("/api/auth/register", status_code=HTTP_201_CREATED)
async def register_user(request: UserRegisterRequest):
    existing = await user_repository.get_user_by_username(request.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists.")
    user = {
        "id": f"usr_{int(datetime.now(UTC).timestamp() * 1000)}",
        "username": request.username,
        "email": request.email,
        "role": "Analyst",
        "created_at": now_iso(),
        "password": hash_password(request.password),
    }
    await user_repository.save_user(user)
    await logs_repository.log_event("INFO", f"Registered new user: {request.username}", "auth")
    return public_user(user)


@app.post("/api/auth/login", response_model=TokenResponse)
async def login_user(request: UserLoginRequest):
    user = await user_repository.get_user_by_username(request.username)
    if not user:
        try:
            user = authenticate_demo_user(request.username, request.password)
        except HTTPException:
            raise HTTPException(status_code=401, detail="Cryptographic token handshake failed or expired.")
    elif not verify_password(request.password, user["password"]):
        raise HTTPException(status_code=401, detail="Cryptographic token handshake failed or expired.")
    
    await logs_repository.log_event("INFO", f"User logged in: {user['username']}", "auth")
    return {
        "access_token": create_access_token(user["username"], user["role"], "access"),
        "refresh_token": create_access_token(user["username"], user["role"], "refresh"),
        "token_type": "bearer",
    }


@app.post("/api/auth/logout")
async def logout_user(user: dict[str, Any] = Depends(current_user)):
    await logs_repository.log_event("INFO", f"User logged out: {user['username']}", "auth")
    return {"message": "Session terminated successfully."}


@app.post("/api/auth/refresh", response_model=TokenResponse)
async def refresh_auth_token(body: dict[str, str]):
    token = body.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Cryptographic token handshake failed or expired.")
    payload = verify_access_token(token)
    if payload.get("typ") != "refresh":
        raise HTTPException(status_code=401, detail="Cryptographic token handshake failed or expired.")
    return {
        "access_token": create_access_token(payload["sub"], payload["role"], "access"),
        "refresh_token": create_access_token(payload["sub"], payload["role"], "refresh"),
        "token_type": "bearer",
    }


@app.post("/api/auth/google", response_model=TokenResponse)
async def google_oauth_login(request: GoogleLoginRequest):
    # Verify code or credential (ID Token)
    try:
        user_info = verify_google_token_or_code(request.code, request.credential)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=401, detail="Google authentication failed or token is invalid.")

    # Extract user details
    email = user_info["email"]
    name = user_info["name"]
    google_sub = user_info["sub"]

    # Check if user exists by email, if not create them
    user = await user_store.get_user_by_email(email)
    if not user:
        # Create a new user with Analyst role
        user = {
            "id": f"usr_g_{google_sub[:10]}",
            "username": name,
            "email": email,
            "role": "Analyst",
            "created_at": now_iso(),
            "password": hash_password(os.urandom(16).hex()),
        }
        await user_store.save_user(user)

    await logs_repository.log_event("INFO", f"Google login successful for user: {email}", "auth")
    return {
        "access_token": create_access_token(user["username"], user["role"], "access"),
        "refresh_token": create_access_token(user["username"], user["role"], "refresh"),
        "token_type": "bearer",
    }


@app.get("/api/auth/google/url")
async def google_auth_url():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    redirect_uri = "postmessage"
    scope = "openid email profile"
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?response_type=code"
        f"&client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&access_type=offline"
        f"&prompt=consent"
    )
    return {"url": url}


@app.get("/api/auth/me")
async def get_current_user(user: dict[str, Any] = Depends(current_user)):
    return public_user(user)


@app.post("/api/files/upload", status_code=HTTP_202_ACCEPTED)
async def upload_sample_file(file: UploadFile = File(...), _user: dict[str, Any] = Depends(current_user)):
    filename = safe_filename(file)
    content = await file.read()
    validate_upload(content, filename, file.content_type)
    report = await save_report_for_content(content, filename)
    return {"task_id": report["id"], "status": "Completed", "message": "Static parsing task spawned successfully."}


@app.post("/api/upload")
async def upload_file_sync(file: UploadFile = File(...), _user: dict[str, Any] = Depends(current_user)):
    filename = safe_filename(file)
    content = await file.read()
    validate_upload(content, filename, file.content_type)
    return await save_report_for_content(content, filename)


@app.get("/api/analysis/{id}/status")
async def get_analysis_status(id: str, _user: dict[str, Any] = Depends(current_user)):
    await get_report_or_404(id)
    return {"task_id": id, "status": "Completed", "progress": 100, "error_details": None}


@app.get("/api/analysis/{id}")
async def get_analysis_results(id: str, _user: dict[str, Any] = Depends(current_user)):
    return await get_report_or_404(id)


@app.get("/api/history")
async def get_history_logs(
    q: str | None = None,
    threat_level: Literal["Low", "Medium", "High", "Critical", "ALL"] = "ALL",
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1),
    _user: dict[str, Any] = Depends(current_user),
):
    records = await history_repository.get_history(500)
    if q:
        q_lower = q.lower()
        records = [item for item in records if q_lower in item["filename"].lower() or q_lower in item["id"].lower()]
    if threat_level != "ALL":
        records = [item for item in records if item["threat_level"] == threat_level]
    start = (page - 1) * limit
    return records[start : start + limit]


@app.delete("/api/history")
async def clear_history_logs(_user: dict[str, Any] = Depends(current_user)):
    if hasattr(history_repository, "clear_history"):
        await history_repository.clear_history()
    return {"status": "ok", "message": "Scan history records cleared successfully."}


@app.post("/api/ai/explain")
async def explain_report_with_ai(request: AIExplainRequest, _user: dict[str, Any] = Depends(current_user)):
    report = await get_report_or_404(request.file_hash)
    explanation = report.get("explanation")
    if not explanation:
        explanation = generate_explanation(report, workspace_settings.get("active_ai_model"))
        report["explanation"] = explanation
        await store.save_report(report)
    return {"file_hash": request.file_hash, "explanation": explanation}


@app.post("/api/ai/chat")
async def ask_ai_translator(request: AIChatRequest, _user: dict[str, Any] = Depends(current_user)):
    report = await get_report_or_404(request.file_hash)
    context = generate_explanation(report, workspace_settings.get("active_ai_model"))
    reply = (
        f"Based on the stored telemetry for {report['filename']}, risk is {report['risk_score']}/100 "
        f"with threat level {report['threat_level']}. Analyst question: {request.message}\n\n{context}"
    )
    return {"reply": reply, "timestamp": now_iso()}


@app.get("/api/reports")
async def list_reports(_user: dict[str, Any] = Depends(current_user)):
    records = await reports_repository.list_reports(500)
    return [
        {
            "id": item["id"],
            "filename": item["filename"],
            "created_at": item["created_at"],
            "created_by": item["created_by"]
        }
        for item in records
    ]


@app.get("/api/reports/{id}")
async def get_report_document(id: str, _user: dict[str, Any] = Depends(current_user)):
    meta = await reports_repository.get_report_metadata(id)
    if not meta:
        raise HTTPException(status_code=404, detail="The requested resource hash does not exist.")
    return {
        "id": meta["id"],
        "filename": meta["filename"],
        "created_at": meta["created_at"],
        "created_by": meta["created_by"]
    }


@app.get("/api/reports/{id}/export")
async def export_report_document(
    id: str,
    format: Literal["pdf", "json", "csv"],
    _user: dict[str, Any] = Depends(current_user),
):
    file_hash = await report_id_to_hash(id)
    if not file_hash:
        raise HTTPException(status_code=404, detail="The requested resource hash does not exist.")
    report = await get_report_or_404(file_hash)
    filename_base = f"SANSEC_REPORT_{report['filename']}"

    if format == "json":
        return JSONResponse(
            content=report,
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.json"'},
        )
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["field", "value"])
        for key in ("id", "filename", "size", "file_type", "entropy", "risk_score", "threat_level", "timestamp"):
            writer.writerow([key, report[key]])
        return PlainTextResponse(
            output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename_base}.csv"'},
        )

    explanation = generate_explanation(report, workspace_settings.get("active_ai_model"))
    pdf_content = generate_pdf_report(report, explanation)
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename_base}.pdf"'},
    )


@app.get("/api/dashboard/stats")
async def get_dashboard_stats(_user: dict[str, Any] = Depends(current_user)):
    records = await history_repository.get_history(500)
    total = len(records)
    return {
        "total_scans": total,
        "threats_detected": len([item for item in records if item["risk_score"] >= 50]),
        "avg_risk_score": round(sum(item["risk_score"] for item in records) / total) if total else 0,
        "pe_binaries_scanned": len([item for item in records if "EXE" in item["file_type"] or "DLL" in item["file_type"]]),
    }


@app.get("/api/analytics/trends")
async def get_analytics_trends(
    filter_type: Literal["ALL", "PE", "PDF", "OFFICE", "APK"] = "ALL",
    _user: dict[str, Any] = Depends(current_user),
):
    records = await history_repository.get_history(500)
    if filter_type != "ALL":
        records = [item for item in records if filter_type in item["file_type"].upper()]
    distribution = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for item in records:
        distribution[item["threat_level"].lower()] += 1
    return {
        "severity_distribution": distribution,
        "historical_scores": [
            {"filename": item["filename"], "risk_score": item["risk_score"], "timestamp": item["timestamp"]}
            for item in records
        ],
    }


@app.get("/api/notifications")
async def get_notifications(_user: dict[str, Any] = Depends(current_user)):
    return [
        {"id": "ntf_engine_ready", "message": "Static analysis engine online.", "severity": "info", "timestamp": now_iso()}
    ]


@app.get("/api/settings")
async def get_settings(_user: dict[str, Any] = Depends(current_user)):
    db_settings = await settings_repository.get_settings()
    workspace_settings.update(db_settings)
    return workspace_settings


@app.put("/api/settings")
async def update_settings(request: WorkspaceSettings, _user: dict[str, Any] = Depends(current_user)):
    updated = await settings_repository.update_settings(request.model_dump())
    workspace_settings.update(updated)
    return workspace_settings


@app.get("/api/admin/users")
async def admin_list_users(_admin: dict[str, Any] = Depends(require_admin)):
    users = await user_repository.list_users()
    return [public_user(user) for user in users]


@app.get("/api/health")
async def check_health_status():
    return {"status": "healthy", "timestamp": now_iso()}


@app.get("/api/version")
async def get_engine_version():
    return {"version": ENGINE_VERSION, "signatures_timestamp": SIGNATURES_TIMESTAMP}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

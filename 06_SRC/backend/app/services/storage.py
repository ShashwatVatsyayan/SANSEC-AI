import logging
import os
import sys
import urllib.parse
from typing import Any, Protocol
from datetime import UTC, datetime

from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient
from app.services.analyzer import to_history_item

logger = logging.getLogger("sansec.storage")


class AnalysisStore(Protocol):
    def get_report(self, file_hash: str) -> dict[str, Any] | None: ...
    def save_report(self, report: dict[str, Any]) -> None: ...
    def history(self, limit: int = 100) -> list[dict[str, Any]]: ...


class InMemoryAnalysisStore:
    def __init__(self) -> None:
        self._reports: dict[str, dict[str, Any]] = {}
        self._history: list[dict[str, Any]] = []

    def get_report(self, file_hash: str) -> dict[str, Any] | None:
        return self._reports.get(file_hash)

    def save_report(self, report: dict[str, Any]) -> None:
        file_hash = report["id"]
        is_new = file_hash not in self._reports
        self._reports[file_hash] = report
        if is_new:
            self._history.insert(0, to_history_item(report))

    def history(self, limit: int = 100) -> list[dict[str, Any]]:
        return self._history[:limit]


def escape_mongo_uri(uri: str) -> str:
    if not uri or "://" not in uri:
        return uri
    try:
        scheme, rest = uri.split("://", 1)
        if "@" not in rest:
            return uri
        parts = rest.rsplit("@", 1)
        credentials = parts[0]
        hosts_and_opts = parts[1]
        
        if ":" not in credentials:
            return uri
            
        username, password = credentials.split(":", 1)
        
        if "@" in password or ":" in password or "/" in password or "+" in password:
            if "%" not in password:
                escaped_password = urllib.parse.quote_plus(password)
                credentials = f"{username}:{escaped_password}"
                return f"{scheme}://{credentials}@{hosts_and_opts}"
    except Exception:
        pass
    return uri


class UserStore(Protocol):
    def get_user_by_username(self, username: str) -> dict[str, Any] | None: ...
    def get_user_by_email(self, email: str) -> dict[str, Any] | None: ...
    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None: ...
    def save_user(self, user: dict[str, Any]) -> None: ...
    def list_users(self) -> list[dict[str, Any]]: ...


class InMemoryUserStore:
    def __init__(self) -> None:
        self._users: dict[str, dict[str, Any]] = {}
        # Prepopulate with admin
        from app.services.auth import hash_password
        admin_pwd = hash_password(os.getenv("SANSEC_ADMIN_PASSWORD", "sansec2026"))
        self._users["usr_admin"] = {
            "id": "usr_admin",
            "username": "admin",
            "email": "admin@sansec.ai",
            "role": "Admin",
            "created_at": "2026-07-02T00:00:00Z",
            "password": admin_pwd,
        }

    def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        for u in self._users.values():
            if u["username"] == username:
                return u
        return None

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        for u in self._users.values():
            if u["email"] == email:
                return u
        return None

    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        return self._users.get(user_id)

    def save_user(self, user: dict[str, Any]) -> None:
        self._users[user["id"]] = user

    def list_users(self) -> list[dict[str, Any]]:
        return list(self._users.values())


# ==============================================================================
# MOTOR ASYNC MONGODB REPOSITORIES
# ==============================================================================

class MongoUserRepository:
    def __init__(self) -> None:
        self._collection = None

    def initialize(self, db) -> None:
        self._collection = db["users"]

    async def create_indexes(self) -> None:
        if self._collection is not None:
            await self._collection.create_index("id", unique=True)
            await self._collection.create_index("username", unique=True)
            await self._collection.create_index("email", unique=True)

    async def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        user = await self._collection.find_one({"username": username}, {"_id": False})
        return dict(user) if user else None

    async def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        user = await self._collection.find_one({"email": email}, {"_id": False})
        return dict(user) if user else None

    async def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        user = await self._collection.find_one({"id": user_id}, {"_id": False})
        return dict(user) if user else None

    async def save_user(self, user: dict[str, Any]) -> None:
        await self._collection.replace_one({"id": user["id"]}, user, upsert=True)

    async def list_users(self) -> list[dict[str, Any]]:
        cursor = self._collection.find({}, {"_id": False})
        return [dict(item) for item in await cursor.to_list(length=1000)]

    async def ensure_admin_exists(self) -> None:
        admin = await self.get_user_by_username("admin")
        if not admin:
            from app.services.auth import hash_password
            admin_pwd = hash_password(os.getenv("SANSEC_ADMIN_PASSWORD", "sansec2026"))
            await self.save_user({
                "id": "usr_admin",
                "username": "admin",
                "email": "admin@sansec.ai",
                "role": "Admin",
                "created_at": "2026-07-02T00:00:00Z",
                "password": admin_pwd,
            })


class MongoUploadsRepository:
    def __init__(self) -> None:
        self._collection = None

    def initialize(self, db) -> None:
        self._collection = db["uploads"]

    async def create_indexes(self) -> None:
        if self._collection is not None:
            await self._collection.create_index("sha256", unique=True)
            await self._collection.create_index("timestamp")

    async def save_upload_metadata(self, upload: dict[str, Any]) -> None:
        await self._collection.replace_one({"sha256": upload["sha256"]}, upload, upsert=True)

    async def get_upload_metadata(self, sha256: str) -> dict[str, Any] | None:
        upload = await self._collection.find_one({"sha256": sha256}, {"_id": False})
        return dict(upload) if upload else None

    async def list_uploads(self, limit: int = 100) -> list[dict[str, Any]]:
        cursor = self._collection.find({}, {"_id": False}).sort("timestamp", -1).limit(limit)
        return [dict(item) for item in await cursor.to_list(length=limit)]


class MongoAnalysisRepository:
    def __init__(self) -> None:
        self._collection = None

    def initialize(self, db) -> None:
        self._collection = db["analysis_reports"]

    async def create_indexes(self) -> None:
        if self._collection is not None:
            await self._collection.create_index("id", unique=True)

    async def get_report(self, file_hash: str) -> dict[str, Any] | None:
        report = await self._collection.find_one({"id": file_hash}, {"_id": False})
        return dict(report) if report else None

    async def save_report(self, report: dict[str, Any]) -> None:
        await self._collection.replace_one({"id": report["id"]}, report, upsert=True)


class MongoReportsRepository:
    def __init__(self) -> None:
        self._collection = None

    def initialize(self, db) -> None:
        self._collection = db["reports"]

    async def create_indexes(self) -> None:
        if self._collection is not None:
            await self._collection.create_index("id", unique=True)
            await self._collection.create_index("timestamp")

    async def save_report_metadata(self, report_meta: dict[str, Any]) -> None:
        await self._collection.replace_one({"id": report_meta["id"]}, report_meta, upsert=True)

    async def get_report_metadata(self, report_id: str) -> dict[str, Any] | None:
        report = await self._collection.find_one({"id": report_id}, {"_id": False})
        return dict(report) if report else None

    async def list_reports(self, limit: int = 100) -> list[dict[str, Any]]:
        cursor = self._collection.find({}, {"_id": False}).sort("timestamp", -1).limit(limit)
        return [dict(item) for item in await cursor.to_list(length=limit)]


class MongoHistoryRepository:
    def __init__(self) -> None:
        self._collection = None

    def initialize(self, db) -> None:
        self._collection = db["analysis_history"]

    async def create_indexes(self) -> None:
        if self._collection is not None:
            await self._collection.create_index("id", unique=True)
            await self._collection.create_index("timestamp")

    async def save_history(self, item: dict[str, Any]) -> None:
        await self._collection.replace_one({"id": item["id"]}, item, upsert=True)

    async def get_history(self, limit: int = 100) -> list[dict[str, Any]]:
        cursor = self._collection.find({}, {"_id": False}).sort("timestamp", -1).limit(limit)
        return [dict(item) for item in await cursor.to_list(length=limit)]

    async def clear_history(self) -> None:
        if self._collection is not None:
            await self._collection.delete_many({})


class MongoSettingsRepository:
    def __init__(self) -> None:
        self._collection = None

    def initialize(self, db) -> None:
        self._collection = db["settings"]

    async def get_settings(self) -> dict[str, Any]:
        settings = await self._collection.find_one({"_id": "workspace_settings"}, {"_id": False})
        if not settings:
            settings = {
                "active_ai_model": os.getenv("SANSEC_ACTIVE_AI_MODEL", "sansec-local-explainer"),
                "max_file_size_mb": int(os.getenv("MAX_UPLOAD_SIZE_MB", "100")),
                "automatic_virustotal_lookup": os.getenv("SANSEC_AUTOMATIC_VT", "false").lower() == "true",
            }
            await self.update_settings(settings)
        return settings

    async def update_settings(self, settings: dict[str, Any]) -> dict[str, Any]:
        doc = dict(settings)
        doc["_id"] = "workspace_settings"
        await self._collection.replace_one({"_id": "workspace_settings"}, doc, upsert=True)
        doc.pop("_id", None)
        return doc

    async def ensure_default_settings(self) -> None:
        await self.get_settings()


class MongoLogsRepository:
    def __init__(self) -> None:
        self._collection = None

    def initialize(self, db) -> None:
        self._collection = db["system_logs"]

    async def create_indexes(self) -> None:
        if self._collection is not None:
            await self._collection.create_index("timestamp")

    async def log_event(self, level: str, message: str, component: str = "backend") -> None:
        doc = {
            "timestamp": datetime.now(UTC),
            "level": level,
            "message": message,
            "component": component
        }
        await self._collection.insert_one(doc)

    async def get_logs(self, limit: int = 100) -> list[dict[str, Any]]:
        cursor = self._collection.find({}, {"_id": False}).sort("timestamp", -1).limit(limit)
        return [dict(item) for item in await cursor.to_list(length=limit)]


import sys

# Detect if running in a unit/integration test environment or in-memory mode
IS_TESTING = (
    os.getenv("TESTING") == "true" or
    os.getenv("SANSEC_ENV") == "test" or
    os.getenv("SANSEC_USE_IN_MEMORY") == "true" or
    "pytest" in sys.modules or
    "unittest" in sys.modules or
    any("test" in arg for arg in sys.argv)
)


def get_mongo_client() -> AsyncIOMotorClient:
    mongo_uri = os.getenv("SANSEC_MONGO_URI") or os.getenv("MONGODB_URI")
    if not mongo_uri:
        raise RuntimeError("MONGODB_URI is not set in backend/.env")
    escaped_uri = escape_mongo_uri(mongo_uri)
    return AsyncIOMotorClient(escaped_uri, serverSelectionTimeoutMS=2000)


async def validate_mongodb_connection(client: AsyncIOMotorClient) -> None:
    try:
        await client.admin.command("ping")
    except Exception as exc:
        raise RuntimeError(f"MongoDB is unavailable: {exc}") from exc


# ==============================================================================
# ASYNC IN-MEMORY MOCKS FOR TESTING
# ==============================================================================

class AsyncInMemoryUserRepository:
    def __init__(self, sync_store: InMemoryUserStore) -> None:
        self._sync_store = sync_store

    async def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        return self._sync_store.get_user_by_username(username)

    async def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        return self._sync_store.get_user_by_email(email)

    async def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        return self._sync_store.get_user_by_id(user_id)

    async def save_user(self, user: dict[str, Any]) -> None:
        self._sync_store.save_user(user)

    async def list_users(self) -> list[dict[str, Any]]:
        return self._sync_store.list_users()

    async def ensure_admin_exists(self) -> None:
        # Done in InMemoryUserStore constructor
        pass


class AsyncInMemoryUploadsRepository:
    def __init__(self) -> None:
        self._uploads = {}

    async def save_upload_metadata(self, upload: dict[str, Any]) -> None:
        self._uploads[upload["sha256"]] = upload

    async def get_upload_metadata(self, sha256: str) -> dict[str, Any] | None:
        return self._uploads.get(sha256)

    async def list_uploads(self, limit: int = 100) -> list[dict[str, Any]]:
        return list(self._uploads.values())[:limit]


class AsyncInMemoryAnalysisRepository:
    def __init__(self, sync_store: InMemoryAnalysisStore) -> None:
        self._sync_store = sync_store

    async def get_report(self, file_hash: str) -> dict[str, Any] | None:
        return self._sync_store.get_report(file_hash)

    async def save_report(self, report: dict[str, Any]) -> None:
        self._sync_store.save_report(report)


class AsyncInMemoryReportsRepository:
    def __init__(self) -> None:
        self._reports = {}

    async def save_report_metadata(self, report_meta: dict[str, Any]) -> None:
        self._reports[report_meta["id"]] = report_meta

    async def get_report_metadata(self, report_id: str) -> dict[str, Any] | None:
        return self._reports.get(report_id)

    async def list_reports(self, limit: int = 100) -> list[dict[str, Any]]:
        return list(self._reports.values())[:limit]


class AsyncInMemoryHistoryRepository:
    def __init__(self, sync_store: InMemoryAnalysisStore) -> None:
        self._sync_store = sync_store

    async def save_history(self, item: dict[str, Any]) -> None:
        # History is saved as side effect of save_report in InMemoryAnalysisStore
        pass

    async def get_history(self, limit: int = 100) -> list[dict[str, Any]]:
        return self._sync_store.history(limit)

    async def clear_history(self) -> None:
        self._sync_store._history.clear()


class AsyncInMemorySettingsRepository:
    def __init__(self) -> None:
        self._settings = {
            "active_ai_model": os.getenv("SANSEC_ACTIVE_AI_MODEL", "sansec-local-explainer"),
            "max_file_size_mb": 5000,
            "automatic_virustotal_lookup": os.getenv("SANSEC_AUTOMATIC_VT", "false").lower() == "true",
        }

    async def get_settings(self) -> dict[str, Any]:
        return self._settings

    async def update_settings(self, settings: dict[str, Any]) -> dict[str, Any]:
        self._settings.update(settings)
        return self._settings

    async def ensure_default_settings(self) -> None:
        pass


class AsyncInMemoryLogsRepository:
    def __init__(self) -> None:
        self._logs = []

    async def log_event(self, level: str, message: str, component: str = "backend") -> None:
        self._logs.append({
            "timestamp": datetime.now(UTC),
            "level": level,
            "message": message,
            "component": component
        })

    async def get_logs(self, limit: int = 100) -> list[dict[str, Any]]:
        return self._logs[:limit]


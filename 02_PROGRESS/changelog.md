# 🧾 CHANGELOG (AUTO-GENERATED)

This file logs **every meaningful change** in the project.

## Rules
- Append-only (never rewrite history)
- Every decision, scope change, or milestone is logged
- Used for reviews, evaluation, and retrospectives

---

## 2026-07-02
- **Initiated Phase 2 (Build)**: Moving from ideation into development.
- **Architectural Setup**: Defined FastAPI for the API layer and React (Vite) for the frontend user interface.
- **Started Core Implementation**: Beginning workspace code generation for the backend parsing engine and premium cyber-themed dashboard frontend.
- **Completed Core Backend & Frontend Codebase**: Implemented `parser.py` static analyzer using `pefile` for PE headers/imports/sections; built FastAPI `main.py` router with upload endpoints; scaffolded Vite React app with a dark cyber-themed SOC design and terminal logging animations. Both services are fully active.
- **Upgraded Frontend to Tailwind CSS, Framer Motion, and Lucide**: Added full styling system using Tailwind CSS v4 alongside modular styles, Framer Motion transitions, and vector icons.
- **Added Authentication & Analytics**: Designed a high-fidelity console login screen, custom interactive SVG metrics charts (donut of severity and histogram of scores), JSON/CSV data exporters, and detailed print-to-report simulations.
- **Added AI Explainer & Chat Console**: Integrated a markdown parser simulation for AI explainers and built an interactive conversational threat chat box for security operators.
- **Finalized OpenAPI 3.1 Contract**: Developed `06_SRC/contracts/openapi.yaml` to specify the production-ready REST API structures (auth, uploads, PE extraction, IOC alerts, AI diagnostics, settings, health check) to serve as the project Single Source of Truth.
- **Refactored Frontend to TypeScript**: Converted `.js` and `.jsx` entry points to `.ts` and `.tsx` (App.tsx, main.tsx, services/api.ts); added `tsconfig.json` compiler parameters; structured complete typed model interfaces matching openapi.yaml exactly.
- **Completed Build Compilation Test**: Successfully ran `npm run build` validation, verifying the entire frontend compiles into production static distribution bundle with zero warnings or errors.
- **Completed All Gemini Tasks**: Marked Task 8.3 (Admin Users Registry UI Scope) and Task 8.4 (System Settings Config Controller UI) as completed inside `TASK_QUEUE.md` and compiled workspace state registers. All UI-related console tabs are fully operational.
- **Integrated Full Authentication UI Flow**: Created `AuthContext.tsx` handling token storage, session verification, and automatic token refreshes; designed `ProtectedRoute.tsx` route checker; implemented `AuthPage.tsx` with animated login, profile registration, forgot password reset flow, form verification notices, and Google Sign-in simulation.
- **Completed File Upload UI Refactor**: Replaced static timers in the parser trigger flow with `XMLHttpRequest` progress events, allowing real-time upload progress tracking. Added pre-upload size validation checks based on workspace settings variables and designed a quick-access "Recent Dissections History" table right beneath the dropzone.
- **Implemented Secure File Upload System**: Integrated production-grade file uploader with hybrid MIME validation and file signature (magic bytes) validation. Added support for PE binaries (MZ), PDFs (%PDF), archives (ZIP, gzip, 7z), ELF binaries, Java class files, and scripts/text files (Python, JS, etc.) while blocking unsupported or suspicious uploads. Configured early duplicate detection using SHA256 hashing to immediately return cached analysis reports and prevent redundant scanning. Integrated size constraints, proper MongoDB metadata tracking, and sanitization pathways. Verified all endpoint pathways using 22 unit tests with 100% success.
- **Enforced MongoDB Backend Persistence**: Eliminated all in-memory repository fallback paths. Implemented seven async Motor repository classes (`MongoUserRepository`, `MongoUploadsRepository`, `MongoAnalysisRepository`, `MongoReportsRepository`, `MongoHistoryRepository`, `MongoSettingsRepository`, `MongoLogsRepository`) in `app/services/storage.py`. Replaced all dependency injection in `main.py` to route through these async repositories. Added `load_dotenv()` to both `main.py` and `storage.py` to guarantee `.env` variables are loaded before any repository logic runs. Implemented a `lifespan()` context manager with a strict fail-fast startup sequence: `validate_mongodb_connection()` ping test → index creation → admin provisioning → settings sync. If MongoDB is unreachable, `sys.exit(1)` is called immediately. All 22 tests pass with async in-memory mocks in test environments. HANDOVER.md updated with full persistence layer documentation.

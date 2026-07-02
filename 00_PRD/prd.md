# SANSEC AI - AI-Powered Malware Analysis Assistant

## 1. Executive Summary

SANSEC AI is a malware analysis platform for static triage, explainable AI reporting, IOC extraction, threat intelligence enrichment, MITRE ATT&CK mapping, and analyst workflow management.

Vision:
- Make malware triage understandable, repeatable, and safe for students, SOC analysts, researchers, and organizations.

Mission:
- Provide a unified analyst workspace that extracts technical evidence from suspicious files without executing them on the host.

Goals:
- Analyze EXE, DLL, APK, PDF, Office, archive, script, and generic binary files.
- Generate hashes, entropy measurements, strings, IOC lists, PE metadata, signatures, risk scores, MITRE mappings, and AI explanations.
- Preserve history and support consistent reports.
- Keep optional external integrations isolated and configurable.

Scope:
- In scope: static analysis, upload workflow, dashboard, history, reports, AI explanations, VirusTotal-style enrichment, YARA, CAPA, MITRE, IOC extraction, risk scoring.
- Out of scope: host execution, kernel debugging, memory dumping, antivirus engine development, unmanaged detonation.

Expected outcomes:
- Faster suspicious-file triage.
- Beginner-friendly explanations of technical findings.
- Repeatable analyst reports with evidence-backed risk scoring.

## 2. Problem Statement

Malware volume is increasing while skilled analysts remain limited. Manual reverse engineering is slow, requires specialized tools, and produces inconsistent reports. Many existing tools expose raw technical output without clear explanations, making them hard for students and junior analysts. SANSEC AI reduces this friction by combining safe static analysis, explainable heuristics, IOC extraction, and reporting.

## 3. Objectives

Primary:
- Analyze suspicious files safely using static techniques.

Secondary:
- Explain malware-like characteristics using AI.
- Generate JSON, Markdown, and PDF-style reports.
- Detect known or likely malware families when signatures or intelligence support it.
- Produce IOC reports.
- Map evidence to MITRE ATT&CK.
- Integrate threat intelligence providers.
- Maintain searchable analysis history.

## 4. User Personas

Student:
- Needs: guided learning, plain-language explanations, PE/document structure understanding.
- Pain: does not understand imports, entropy, sections, IOCs, or suspicious strings.

SOC Analyst:
- Needs: fast triage, severity, indicators, recommended next steps.
- Pain: too many alerts and inconsistent manual reporting.

Security Researcher:
- Needs: detailed static findings, exports, YARA/CAPA support, strings, imports, and IOCs.
- Pain: repeated tool switching and lost context.

Organization:
- Needs: internal suspicious-file scanning, access control, audit logs, consistent reports.
- Pain: manual triage does not scale.

## 5. Functional Requirements

### Login
Purpose:
- Authenticate users and enforce role-based access.

Workflow:
- User submits credentials.
- System validates identity and establishes a session.
- User role controls dashboard, settings, and admin access.

API:
- POST /auth/login
- POST /auth/logout
- GET /auth/me

Acceptance criteria:
- Invalid credentials return generic errors.
- Sessions expire.
- Admin-only endpoints reject non-admin users.

### Dashboard
Purpose:
- Show scan volume, threat counts, average risk, recent scans, and quick access to scanner/history.

Workflow:
- User opens dashboard.
- System loads recent analysis history and summary metrics.

Acceptance criteria:
- Recent scans are visible.
- High-risk files are easy to identify.

### Upload
Purpose:
- Accept suspicious files for static analysis.

Workflow:
- User uploads a file.
- System validates size and emptiness.
- File bytes are analyzed without execution.
- Duplicate hashes return cached reports.

Validation:
- Reject empty uploads.
- Limit maximum file size.
- Treat filename as metadata only.

API:
- POST /api/upload

Acceptance criteria:
- Uploads never execute.
- SHA-256 deduplication works.
- Failed uploads return structured errors.

### Static Analysis
Purpose:
- Extract deterministic technical evidence.

Workflow:
- Compute MD5, SHA-1, SHA-256.
- Detect file type by magic bytes and extension hints.
- Compute Shannon entropy.
- Extract ASCII and UTF-16LE strings.
- Parse PE metadata when applicable.
- Extract URLs, domains, IPv4 addresses, and emails.
- Match heuristic signatures.
- Calculate risk score.

Acceptance criteria:
- Readable files always produce hashes, size, type, entropy, and score.
- Parser failures become warnings/errors in the report instead of crashing the service.

### AI Explanation
Purpose:
- Convert raw findings into analyst-readable explanations.

Workflow:
- User requests explanation.
- System grounds output in report fields.
- Explanation covers risk, evidence, MITRE mapping, IOCs, and recommended action.

API:
- POST /api/ai/explain

Acceptance criteria:
- Explanation references observed findings.
- No unsupported claim should be presented as fact.

### Reports
Purpose:
- Generate shareable analysis artifacts.

Workflow:
- User opens a scan report.
- System displays metadata, signatures, IOCs, PE details, risk score, MITRE mappings, and AI explanation.

Acceptance criteria:
- Report contains hashes, risk score, evidence, and IOCs.

### Threat Intel
Purpose:
- Enrich hashes and IOCs with external intelligence.

Workflow:
- Optional providers query hash or IOC metadata.
- Results are normalized and timestamped.

Acceptance criteria:
- Core analysis works when provider keys are absent.
- Provider failures do not fail the scan.

### History
Purpose:
- Preserve scanned file summaries.

Workflow:
- User opens history.
- User loads past report by hash.

API:
- GET /api/history
- GET /api/analysis/{file_hash}

Acceptance criteria:
- History records include filename, type, score, level, and timestamp.

### Settings
Purpose:
- Configure file limits, integrations, UI preferences, and API keys.

Acceptance criteria:
- Secrets are not exposed after saving.
- Non-admin users cannot change global settings.

### Admin
Purpose:
- Manage users, rules, provider settings, audit logs, and job health.

Acceptance criteria:
- Admin actions are audited.

## 6. UI Requirements

Theme:
- SANSEC dark workspace using black, white, dark yellow/gold, neutral gray, and limited teal/red severity accents.

Screens:
- Dashboard
- Static Scanner
- Analysis Report
- History
- Cyber Intelligence / integrations
- Settings
- Admin

Layout:
- Sidebar navigation on desktop.
- Responsive content area.
- Compact cards/tables suited for repeated analyst work.

Accessibility:
- Keyboard-accessible controls.
- Clear focus states.
- Sufficient contrast.
- No critical information conveyed by color alone.

## 7. Architecture

Source layout:
- `06_SRC/backend`: FastAPI API and static analysis parser.
- `06_SRC/frontend`: React/Vite analyst workspace.
- `06_SRC/ml`: future AI prompts, model adapters, and evaluations.

Current backend:
- FastAPI service.
- In-memory analysis cache/history.
- `app.analysis.parser` for hashes, entropy, file type, strings, PE parsing, IOCs, signatures, and scoring.

Current frontend:
- React dashboard/scanner/history/report UI.
- Calls backend at `http://localhost:8000`.

Security boundary:
- Static only.
- Uploaded bytes are not executed.
- External integrations remain optional.

## 8. MVP Plan

MVP 1:
- FastAPI upload endpoint.
- Static parser.
- React scanner/dashboard.
- History and report display.
- Mock AI explanation.

MVP 2:
- Persistent database.
- Report export.
- Authentication.

MVP 3:
- YARA, CAPA, VirusTotal, MITRE enrichment.
- Real AI provider adapter.

MVP 4:
- Admin controls, audit logs, evaluation corpus, deployment packaging.

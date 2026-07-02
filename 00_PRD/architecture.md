# SANSEC AI Architecture

## Current Runtime

Backend:
- FastAPI application in `06_SRC/backend/main.py`.
- Static parser in `06_SRC/backend/app/analysis/parser.py`.
- In-memory cache keyed by SHA-256.
- Endpoints for health, upload, history, report lookup, and AI explanation.

Frontend:
- React/Vite app in `06_SRC/frontend`.
- Dashboard, scanner, history, report view, PE tables, IOC display, MITRE mapping, and AI explanation panel.

ML:
- `06_SRC/ml` reserved for prompt templates, provider adapters, and evaluation assets.

## Data Flow

1. User uploads file in the React scanner.
2. Frontend posts multipart form data to `POST /api/upload`.
3. Backend reads bytes and computes static findings.
4. Backend caches full report by SHA-256 and inserts a history summary.
5. Frontend renders metadata, signatures, PE details, IOCs, risk, and MITRE mappings.
6. User can request `POST /api/ai/explain` for a grounded explanation.

## Static Analysis Pipeline

- Hashes: MD5, SHA-1, SHA-256.
- File type: magic bytes plus extension hints.
- Entropy: Shannon entropy.
- Strings: ASCII and UTF-16LE printable strings.
- PE analysis: architecture, entry point, sections, imports, exports, suspicious APIs.
- IOC extraction: URLs, domains, IPv4 addresses, emails.
- Signatures: section anomalies, suspicious imports, high entropy, embedded indicators.
- Risk scoring: explainable heuristic score capped at 100.

## Security Constraints

- Uploaded files are never executed.
- Host filesystem paths are never derived from untrusted filenames.
- File size limits protect memory use.
- Optional external threat-intel submission must be configurable.
- Future persistence must store samples in quarantine storage outside public roots.

## Next Architecture Additions

- SQLite/PostgreSQL persistence for users, files, analyses, IOCs, reports, and audit events.
- Authentication and role-based authorization.
- Background worker queue for large files and integrations.
- Export service for JSON, Markdown, and PDF reports.
- Provider adapters for YARA, CAPA, VirusTotal, and OpenAI-compatible AI explanations.

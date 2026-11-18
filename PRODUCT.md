# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Junior Security Analysts & Cybersecurity Students**: Needs guided threat triage, plain-language explanations of suspicious binary characteristics (entropy, sections, suspicious imports), and educational walkthroughs without overwhelming jargon.
- **Senior SOC Analysts & Reverse Engineers**: Needs high-density, rapid zero-detonation triage, granular static telemetry (PE headers, hashes, imports/exports, strings, YARA signatures), MITRE ATT&CK mapping, and exportable forensics artifacts (PDF, JSON, CSV).
- **Incident Response Teams**: Needs centralized scan history, audit logging, repeatable evidence-backed risk scores, and quick export to incident management systems.

## Product Purpose

SANSEC AI is an AI-powered malware triage workspace and heuristic static analysis engine. It provides safe, zero-execution dissection of suspicious payloads (EXE, DLL, PDF, Office, APK, archives, scripts) on analyst workstations, transforming complex binary metadata into understandable risk scores, MITRE ATT&CK tactics, and actionable AI-driven incident reports.

## Positioning

Safe static inspection meets explainable dual-tier intelligence: unlike raw CLI disassemblers that dump impenetrable hex/tables, or opaque cloud sandboxes that require risky detonation, SANSEC AI combines host-safe local heuristic parsing with contextual, conversational AI triage suited for both junior learners and veteran defenders.

## Operating Context

- **Workstations**: Browser-based SOC workstation console running locally or internally.
- **Workflow**: Analysts drag-and-drop suspicious payloads, monitor real-time upload and static extraction phases, inspect risk score breakdowns, engage in AI chat over extracted indicators, and export formal reports.
- **Deployment Boundaries**: Hybrid architecture — an offline-first core engine for static parsing and local database/in-memory operation, with configurable opt-in connectors for external enrichment (VirusTotal API v3) and AI reasoning (Local explainer, OpenAI, or Google Gemini).

## Capabilities and Constraints

- **Capabilities**:
  - Safe static extraction (SHA-256/MD5/SHA-1, entropy calculation, section analysis, PE headers, imports/exports, strings, YARA signatures).
  - MITRE ATT&CK automated technique mapping (Execution, Defense Evasion, C2, Privilege Escalation).
  - Configurable multi-provider AI reasoning engine (sansec-local-explainer, OpenAI GPT, Google Gemini).
  - External threat intelligence lookup via VirusTotal v3.
  - Multi-format forensic reporting (Dark-cyber themed PDF export, Markdown, JSON, CSV).
  - Persistent user authentication, audit logging, and analysis history.
- **Constraints**:
  - Zero dynamic execution: No host detonation, memory dumping, or kernel debugging.
  - File size threshold: Default 100 MB upload limit enforced at client and server layers.

## Brand Commitments

- **Identity**: "SANSEC AI" — professional, rigorous, dark-cyber defense workspace.
- **Visual Tone**: Cyberpunk / SOC console aesthetic with deep obsidian backgrounds (`#080a0f`), crisp typography (Inter and JetBrains Mono), scanline accents, and high-contrast telemetry indicators (emerald for benign, amber for suspicious, ruby for malicious).
- **Voice**: Precise, evidence-backed, defensive, objective; avoids hype, moralizing, or ungrounded certainty.

## Evidence on Hand

- Complete OpenAPI 3.0 contract specification at `06_SRC/contracts/openapi.yaml`.
- Verified FastAPI microservice backend with 22 passing unit, integration, and contract tests in `06_SRC/backend/tests/`.
- Production-tested React + TypeScript + Vite frontend in `06_SRC/frontend/`.
- Generated forensic walkthrough report: `dissection_walkthrough_report.pdf`.

## Product Principles

1. **Safety First**: Static analysis only — analyze untrusted binaries safely without host execution.
2. **Dual-Tier Clarity**: Present clear high-level risk summaries for rapid triage, backed by exhaustive raw technical evidence for deep verification.
3. **Evidence-Backed Attribution**: Every threat flag, MITRE ATT&CK tactic, and risk rating must trace to specific observed binary artifacts (entropy, strings, API calls, or hashes).
4. **Resilient Autonomy**: Core operations function completely offline with local heuristics and in-memory persistence; cloud enrichment enhances but is never a hard dependency.

## Accessibility & Inclusion

- Keyboard navigability across all triage tabs, file uploader, and interactive chat panels.
- High-contrast visual cues and redundant text labels alongside color-coded severity badges for color-blind accessibility.
- Screen-reader friendly semantic layout across data tables, entropy meters, and report summaries.

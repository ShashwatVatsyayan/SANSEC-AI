# 📘 PROJECT CONTEXT (AUTO-MAINTAINED)

This file represents the **current, shared understanding** of the project.
It evolves as decisions are made or understanding deepens.

## Rules
- Must always align with the latest PRD
- Updated automatically after design, implementation, or scope changes
- Written for humans AND AI continuity

## Current Understanding
SANSEC AI is an AI-powered malware analysis assistant. The Frontend & Architecture Agent integrated the drag-and-drop file upload engine inside the React-TS frontend. The uploader validates file size parameters against custom workspace configurations and tracks payload upload progress in real-time via `XMLHttpRequest` event listeners. It links uploaded assets directly to the asynchronous analysis endpoints, triggers logging milestones, and renders a "Recent Dissections History" quick-access grid underneath.

## Current Phase
Deployment Readiness (Phase 4/4)

## Key Principles
- Upload Progress: Hooked to `xhr.upload` event parameters to separate transport overhead from extraction timing.
- Size Verification: Local constraints enforce boundaries before payload bytes leave client workstations.
- Quick Access Archives: Rendered in the scanner tab to allow immediate reloading of active session reports.

## Last Updated
2026-07-02T19:33:00

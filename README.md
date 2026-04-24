# Code Health CLI + API

## Product Description
Code Health is a project intelligence tool that scans a repository and surfaces actionable maintenance signals beyond linting. It helps teams quickly identify cleanup opportunities and risk areas by reporting TODO debt, oversized files, potentially unused dependencies, and git-based change patterns.

## Epic
As an engineering team, we need a fast and reliable code health scanner that can run from both a CLI and an HTTP API so we can automate repository hygiene checks and prioritize technical debt with clear, actionable outputs.

## Features
- Scan any local directory for code health signals.
- Detect TODO-style comments (`TODO`, `FIXME`, `HACK`, `XXX`) with file and line location.
- Detect large files by configurable line-count threshold.
- Detect potentially unused npm dependencies (heuristic-based).
- Detect stale files and hotspots using git history.
- Output as human-readable table (CLI) or machine-readable JSON.
- Expose `POST /scan` and `GET /health` endpoints for integration.

## User Stories
- As a developer, I want to run a single command to find TODO debt so I can plan cleanup work.
- As a maintainer, I want large files flagged so I can split complex files before they become harder to maintain.
- As a tech lead, I want potentially unused dependencies identified so I can reduce bloat and security surface area.
- As a platform engineer, I want a JSON API scan endpoint so I can integrate code health checks into CI and internal tooling.
- As a team member, I want stale-file and hotspot insights so I can focus code review and refactoring where it matters most.

## Demo
### Environment
- OS: macOS
- Runtime: Node.js with TypeScript (`ts-node`, `tsc`)

### Executed Checks and Results
1. TypeScript compile check
   - Command: `npx tsc --noEmit`
   - Result: Build clean (no TypeScript errors).

2. CLI scan (table format)
   - Command: `npx ts-node src/cli.ts scan . --format table`
   - Result: Report rendered successfully with sections for TODOs, Large Files, Unused Dependencies, Stale Files, Hotspots, and Warnings.

3. CLI scan (JSON format)
   - Command: `npx ts-node src/cli.ts scan . --format json`
   - Result: Valid JSON output with keys:
     - `todos`
     - `largeFiles`
     - `unusedDeps`
     - `staleFiles`
     - `hotspots`
     - `warnings`
     - `meta`

4. API health endpoint
   - Command: `curl -s http://localhost:3000/health`
   - Result: `{"status":"ok"}`

5. API scan endpoint
   - Command: `curl -s -X POST http://localhost:3000/scan -H 'Content-Type: application/json' -d '{"path":"/Users/imacdoc/code-health"}'`
   - Result: HTTP 200 with valid `ScanResult` JSON payload.

6. Production build
   - Command: `npm run build`
   - Result: Successful build to `dist/` with zero compile errors.

### Notes from Demo Run
- Unused dependency analysis is heuristic-based and may produce false positives for dynamic imports.
- Git-age analysis returns warnings when the target directory is not a git repository.

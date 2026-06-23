# Evolution Proposal: Vite silent build failures on Windows — clear .vite cache

- Proposal-ID: evo-2026-06-23-tools-vite-cache-clean
- Status: pending
- Signature: tools-vite-cache-clean
- Created-At: 2026-06-23 05:30
- Last-Seen-At: 2026-06-23 05:30
- Target-File: TOOLS.md
- Trigger-Type: pitfall
- Confidence: high

## Why This Matters
On Windows, Vite can accumulate stale/corrupted cache in `node_modules/.vite`, causing builds to fail silently at the "transforming..." stage — exit code 1, no visible error message. This wastes significant debugging time (5+ failed attempts in a row before diagnosis). This has happened multiple times in this project and is a known Vite-on-Windows pattern.

## Evidence
- 5 consecutive build attempts failed with exit code 1 but NO visible error output
- Build would reach "transforming..." and silently die
- Root cause: stale/corrupted Vite cache in `node_modules/.vite`
- Fix applied: `Remove-Item -Path "node_modules/.vite" -Recurse -Force` and `Remove-Item -Path "dist" -Recurse -Force`
- After cache clean: client "✓ built in 1m 57s", SSR "✓ built in 20s" — immediate success
- This is a recurring pitfall on Windows with Vite projects; same pattern has happened before in this project

## Duplicate Check
- Checked: TOOLS.md, pending/ directory, approved/ directory
- No existing draft or section for Vite cache corruption
- Signature `tools-vite-cache-clean` is unique
- Distinct from the pending `tools-pascalcase-component-files` draft (component naming vs. build cache)

## Proposed Change

Append a new section to TOOLS.md after the existing sections:

---

### Vite Silent Build Failures (Windows)

**Pitfall:** On Windows, Vite can accumulate stale or corrupted cache in `node_modules/.vite`. The build gets to "transforming..." and silently exits with code 1 — no error message, no stack trace. This is indistinguishable from a code error without cache-aware diagnosis.

**Symptom:** `npm run build` (or `vite build`) exits with code 1 immediately after logging "transforming..." — no further output.

**Fix — clear the cache first:**
```powershell
Remove-Item -Path "node_modules/.vite" -Recurse -Force
Remove-Item -Path "dist" -Recurse -Force
```

Then retry the build. This resolves the issue in nearly all cases without needing a full `node_modules` reinstall.

**When to suspect cache corruption:**
- Build was previously working, then starts failing with no code changes
- Error output is missing or truncated despite exit code 1
- The same build succeeds on another machine or after `node_modules` wipe
- "transforming..." is the last log line before failure

**Do NOT immediately:**
- ❌ Reinstall `node_modules` (expensive, usually unnecessary)
- ❌ Bisect code changes when nothing changed

---

## Apply Plan
1. Present to user for approval via evolution_proposal tool
2. On approval, append the new section to TOOLS.md
3. Move this draft to `evolution-drafts/approved/`

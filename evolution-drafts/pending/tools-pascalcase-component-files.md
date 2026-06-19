# Evolution Proposal: Component file names must match import casing (PascalCase) — Windows dev + Vercel Linux deployment

- Proposal-ID: evo-2026-06-19-tools-pascalcase-component-files
- Status: pending
- Signature: tools-pascalcase-component-files
- Created-At: 2026-06-19 02:36
- Last-Seen-At: 2026-06-19 02:36
- Target-File: TOOLS.md
- Trigger-Type: pitfall
- Confidence: high

## Why This Matters
Windows filesystem is case-insensitive, so a file named `saledetaildialog.tsx` imported as `SaleDetailDialog` works fine locally. But Vercel runs on Linux, which is case-sensitive — causing `ENOENT` build failures. This has already caused a production build failure. Future sessions creating new components need this documented to avoid repeating the mistake.

## Evidence
- Vercel build failed with: `ENOENT: no such file or directory, open '/vercel/path0/src/components/SaleDetailDialog'`
- Root cause: Three component files created on Windows with lowercase names (`saledetaildialog.tsx`, `paymentqrdialog.tsx`, `paymentterminaldialog.tsx`) but imported throughout the codebase as PascalCase (`SaleDetailDialog`, `PaymentQRDialog`, `PaymentTerminalDialog`)
- Fix: renamed all three files to PascalCase to match their import statements
- The browser-print fix also inadvertently created files with this same issue, demonstrating recurrence risk
- This is a recurring risk: Windows dev machine + Vercel Linux deployment

## Duplicate Check
- Checked: pending/ directory, approved/ directory
- No existing draft for this topic
- TOOLS.md has no existing rules about file naming or case sensitivity
- Signature `tools-pascalcase-component-files` is unique

## Proposed Change

Append a new section to TOOLS.md after the existing "Browser Printing (Ticket)" section:

---

### Component File Naming (React/Vite + Vercel)

**Pitfall:** Creating `.tsx` component files with lowercase names (e.g., `saledetaildialog.tsx`) will pass local builds on Windows (case-insensitive filesystem) but fail on Vercel (Linux, case-sensitive) when imported as PascalCase (`SaleDetailDialog`).

**Rule:** Always name React component files to **exactly match** their default export name:
- ✅ `SaleDetailDialog.tsx` → `import { SaleDetailDialog } from …`
- ✅ `PaymentQRDialog.tsx` → `import { PaymentQRDialog } from …`
- ❌ `saledetaildialog.tsx` → breaks on Vercel when imported as `SaleDetailDialog`
- ❌ `paymentqrdialog.tsx` → breaks on Vercel when imported as `PaymentQRDialog`

**Checklist:**
1. Component file name = default export name (PascalCase)
2. All import paths use the exact same casing as the file on disk
3. Run `git ls-files src/components` before pushing to verify case consistency

---

## Apply Plan
1. Present to user for approval via evolution_proposal tool
2. On approval, append the new section to TOOLS.md after the Browser Printing section
3. Move this draft to `evolution-drafts/approved/`

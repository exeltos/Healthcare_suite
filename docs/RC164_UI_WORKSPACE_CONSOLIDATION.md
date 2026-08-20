# Healthcare Suite rc.164 — UI Workspace Consolidation

## Scope
- Workspace-first presentation for large record editors while keeping the left navigation visible.
- Modal presentation reserved for compact tasks (Core auto threshold reduced to 620px).
- Canonical FormActions implementation: destructive/secondary actions left, Cancel + Save right.
- Destructive action uses a soft danger treatment so Save remains the visual primary action.
- Canonical tab height, typography and spacing across Core drawers/workspaces.
- Patient Samples migrated from a custom footer to shared FormActions.
- Legacy large drawers normalized to full application workspace geometry.
- Form action audit updated to validate shared component usage rather than duplicated literal labels.

## Verification
- audit-form-action-consistency.mjs: 8/8 PASS
- check-imports.mjs: PASS (0 missing imports)
- design-system-audit.mjs: PASS
- consistency-audit.mjs: PASS

## Build note
A local Vite build could not be executed in the artifact environment because the supplied archive did not include node_modules or a lockfile and dependency installation was unavailable. No build failure caused by source code was observed.

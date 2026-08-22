# RC217 — Audit consolidation

- Added one canonical static release runner: `tools/canonical-release-suite.mjs`.
- Removed historical rc-specific scripts from `package.json` release chaining.
- Preserved historical audit files as evidence only.
- Introduced generic current audit names for production persistence, fail-closed persistence, clinical write verification and hospital E2E readiness.
- Made version checks release-candidate aware instead of pinning the suite to a historical rc number.
- Fixed direct browser `sessionStorage` access in `LoginPage.jsx`; Demo runtime state now uses the shared storage boundary.
- Aligned package, runtime and Help Center version to `0.12.0-rc.217`.

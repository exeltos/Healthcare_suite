# RC213 — Release reproducibility hardening

## Changes
- `package-lock.json` is now a mandatory release-preflight artifact rather than a warning.
- `verify-release.cmd` now requires the lockfile and uses `npm ci`, never an unconstrained `npm install`.
- Node/npm expectations are declared in `package.json`; `.nvmrc` records the verification Node major.
- Release verification order is now: exact dependency install → preflight → full static release suite → syntax check → Vite production build.

## Environment limitation during this packaging run
The execution environment used to prepare RC213 could not reach the npm registry and had no npm cache, so a trustworthy transitive `package-lock.json` could not be generated. A synthetic lockfile was intentionally **not** created. Therefore RC213 correctly remains blocked by preflight until the lockfile is generated once in an npm-connected environment.

Use:

```cmd
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
verify-release.cmd
```

The generated lockfile must then be retained with the release source so future verification uses `npm ci`.

## Additional release audit finding
The current architecture audit still blocks the full static release suite because six source modules exceed the project's 32 KB maintainability threshold. This is an existing refactoring item, not a reproducibility regression.

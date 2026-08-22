# Healthcare Suite audit strategy — rc.217+

The release gate is intentionally split into three layers:

1. **Canonical static gate** — `npm run release:static`
   - architecture, imports, navigation, UI/design consistency
   - security, RBAC and tenant isolation
   - clinical/staff/quality/organization integrity
   - authoritative persistence and fail-closed behavior
   - Supabase schema/readiness, clean Production boundaries and governance
   - hospital E2E harness readiness

2. **Reproducible build gate** — `npm run release:verify`
   - requires a committed `package-lock.json`
   - installs exact dependencies with `npm ci`
   - runs canonical static gate, syntax validation and Vite production build

3. **Live acceptance gate** — `npm run e2e:hospital-release`
   - requires two normal test users in two different test organizations
   - validates real Supabase RLS, persistence and end-to-end hospital workflows

Historical `scripts/audit-rc*.mjs` files remain in the repository as regression evidence, but they are **not part of the release gate**. New release decisions must use the canonical current suite, not version-pinned historical audits.

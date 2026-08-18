# P0 Release Verification — Healthcare Suite rc.80

## Required local/CI release sequence
1. Use Node 20 or newer.
2. Run `npm install` from a clean checkout.
3. Commit the generated `package-lock.json` before final v1.0 tagging.
4. Run `npm run release:verify`.
5. Release only when preflight, static audits, Babel syntax parsing and Vite production build all pass.

## What `release:verify` now enforces
- build dependencies are physically installed;
- no frontend VITE_* secret/service-role value is present;
- all architecture, navigation, design, workflow, i18n and production audits pass;
- security and tenant-isolation contracts pass;
- clinical integrity and the 15-scenario clinical contract audit pass;
- production/demo separation and deployment readiness pass;
- all JS/JSX parses through Babel;
- the final Vite production bundle builds successfully.

## Live verification still required before v1.0
Static source contracts cannot prove a deployed Supabase environment. Complete `P0_TENANT_ISOLATION_VERIFICATION.md` and `P0_CLINICAL_E2E_VERIFICATION.md` against a dedicated test Supabase organization before production release.

# RC215 — Live Supabase E2E Harness

This release adds a zero-dependency live Supabase contract runner for the P0 hospital-production verification phase.

## What it verifies against a real Supabase project

- Authenticated user resolves the server-side organization context.
- Patient create returns the authoritative Supabase row and survives a fresh read-back.
- Duplicate non-empty AMKA is rejected inside the organization.
- Surveillance case is linked to the intended patient.
- Patient sample has a first-class `surveillance_case_id` relationship.
- Cross-patient sample/case relationship is rejected by the database guard.
- Recheck `parent_sample_id` and `root_sample_id` persist.
- Infection → surveillance case → source sample relationships persist.
- Isolation → surveillance case relationship persists.
- Isolation end date before start date is rejected by the database guard.
- With a second test organization: Tenant A cannot read Tenant B clinical records and cannot write into Tenant B.
- Delete returns the deleted authoritative row and a subsequent read proves the record is absent.
- Cleanup deletes only records created by the unique E2E run prefix.

## Safety

The runner uses normal authenticated test users and the publishable/anon key. It does **not** accept or require a Supabase service-role key. Do not use real patient identifiers. Run against dedicated test organizations, preferably a dedicated staging Supabase project.

## Run

Set the variables shown in `.env.e2e.example` in the local shell/CI secret store, then run:

```bash
npm run e2e:supabase-clinical
```

The second test user must belong to a different organization if the cross-tenant RLS tests are to run.

## What this does not claim

This is a real database/auth/RLS/relationship E2E contract test, but it is not yet a browser/UI E2E test. The clinical UI scenario matrix in `docs/P0_CLINICAL_E2E_VERIFICATION.md` remains required for final hospital-production acceptance, including EL/EN visual behavior and cross-module UI reflections.

## Strict release mode

For release acceptance run `npm run e2e:release`. This invokes the same live runner with `--strict`, which requires credentials for a second user in a genuinely different organization; tenant isolation may not be skipped in release mode.

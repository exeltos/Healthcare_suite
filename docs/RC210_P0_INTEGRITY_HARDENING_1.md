# Healthcare Suite v0.12.0-rc.210 — P0 Integrity Hardening 1

## Scope
First package of the Production Hardening phase.

## Changes
- Committee meeting attendance is now validated against the committee member registry before relational persistence.
- Registry-backed attendee identity is canonicalized from `committee_members`; arbitrary employee/person payloads are rejected.
- Added database trigger `guard_committee_meeting_attendee_membership()` so attendance integrity is enforced even if a client bypasses the React/service layer.
- Updated the production persistence audit to the current antimicrobial DDD backend API (`saveIndicatorSourceRecordBackend`).
- Updated clinical integrity checks to the current isolation status derivation and verified first-class `surveillance_case_id` persistence.
- Release version advanced to `0.12.0-rc.210`.

## Verification completed
- Production persistence audit: 20/20 PASS.
- Clinical integrity audit: PASS.
- Organization integrity audit: PASS.
- Migration schema audit: 50 migrations checked, FK column types compatible.
- Modified JavaScript files pass Node syntax checks.

## Still open in P0
- Production operational browser writes must be converted from permissive ephemeral-memory fallback to an explicit fail-closed/cache-only boundary.
- A reproducible dependency lockfile (`package-lock.json`) is still required before v1.0.
- Full Vite build was not verified in this environment because dependencies are not installed.
- Live Supabase E2E verification remains required.

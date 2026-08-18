# Healthcare Suite rc.81 — P1 Governance Completion

This release consolidates the remaining P1 governance items before final user testing.

## Implemented
- Governance Center inside Management Center.
- Read-only immutable System Audit Trail viewer.
- Notification & escalation policy editor with live Notification Center enforcement.
- Data retention / archiving policy management.
- Backup, RPO/RTO and business continuity profile.
- Recovery / restore test evidence log.
- Server-side security account / privilege / department-access events.
- Privacy / GDPR readiness governance checklist.
- Competency-gap and retraining overview.
- Indicator definition provenance/history with immutable version evidence.
- Controlled-document revision history remains available in the document card.

## Database
New migration:
`supabase/migrations/20260818_000028_governance_visibility_activation.sql`

Apply all pending migrations to the target Supabase project before Production testing.

## Verification
`npm run release:static`

Expected rc.81 result:
- 326 reachable source files
- 0 missing imports
- Tenant isolation 11/11
- Clinical scenario contracts 15/15
- Governance visibility 16/16
- 28 migrations schema-compatible
- Deployment readiness: 0 findings / 0 blockers

## Still requires live final testing
- Clean dependency install and Vite production build.
- Real Supabase two-organization tenant isolation scenario.
- Real role/account matrix.
- End-to-end clinical scenarios.
- Backup/restore evidence against the actual hosting environment.
- Visual/UX verification of the Governance Center in EL/EN and tablet widths.

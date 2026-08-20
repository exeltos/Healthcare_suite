# Healthcare Suite rc.170 — General Review

## Navigation change
- Promoted Antibiotics moved from Surveillance to Records.
- Antimicrobial Consumption moved from Surveillance to Records.
- Antimicrobial Consumption uses analytics/chart icon; Promoted Antibiotics keeps medication icon.
- Existing routes and RBAC mapping are retained to avoid breaking deep links/data flows.

## Current static audit snapshot
- Form action / WHO consistency: 8/8 PASS
- Governance visibility: 16/16 PASS
- Supabase static readiness: 10/10 PASS
- 22 audit scripts PASS overall.
- 0 TODO/FIXME markers found in JS/CSS.
- Shared FormActions is used broadly; remaining legacy/custom modal patterns still require consolidation.

## Important remaining release blockers / debt
1. Production browser-storage fail-closed guard is reported missing by deployment readiness audit.
2. Antimicrobial DDD production persistence audit: 19/20; DDD write-through to indicator Supabase backend still fails the audit.
3. Patient runtime audit: 4/7; persistence source feedback/demo warnings need alignment.
4. Netlify build audit: 5/7; build command expectations need alignment.
5. Password recovery/reset audits have remaining failures, including PKCE exchange expectation.
6. Competency closed-loop audit: 9/10; UI evidence check remains.
7. Release preflight cannot pass without installed build dependencies and package-lock.
8. Some older final-readiness audit assertions are version-pinned and therefore stale for rc.170.

## Assessment
The application is functionally broad and the UI architecture is substantially more consistent than earlier RCs, but it is not yet a final v1.0 production release. The next priority should be production persistence/auth/deployment hardening, followed by the remaining page-level UI consolidation and full end-to-end regression testing.

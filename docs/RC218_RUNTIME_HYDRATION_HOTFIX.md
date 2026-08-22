# Healthcare Suite 0.12.0-rc.218 — Runtime hydration hotfix

## Fixed
- Production dashboard white-screen after successful login caused by `loadPatientSamples()` attempting an operational repository write during synchronous UI read/render.
- Production reads are now side-effect free for patient samples; persistence/mirroring remains owned by verified Supabase backend services.
- Form-template read seeding is also prevented from writing during Production reads, avoiding the same fail-closed runtime class in Forms/Audits/Bundles.

## Guardrail
- Added `scripts/audit-production-read-purity.mjs` and included it in the canonical release suite.
- Canonical static release suite: 32/32 PASS.

## Production principle
A UI read must never need write permission. Authoritative writes happen through Supabase backend services, and only verified backend reads/writes may update the in-memory compatibility cache.

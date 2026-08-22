# Healthcare Suite v0.12.0-rc.211 — P0 Fail-Closed Production Persistence

## Goal
Production operational state must never appear successfully saved solely because a synchronous compatibility repository updated browser memory. Supabase is authoritative.

## Changes
- `writeJson()` now fails closed for operational Production keys unless called inside an explicit verified-cache scope.
- Added `withProductionCacheWrite()` for synchronous in-memory mirrors only after Supabase load/write verification.
- Production backend hydration/cache paths for clinical, quality, organization, indicators, prevention, surveillance controls and configuration now use the explicit verified-cache scope.
- Production startup cache clearing is explicitly scoped and remains non-durable.
- Deployment readiness audit now checks the fail-closed boundary.
- Added `audit:fail-closed` release audit.

## Safety property
A direct Production call to a legacy/local operational repository now throws instead of returning a value that could be mistaken for durable persistence. Demo/local mode remains unchanged.

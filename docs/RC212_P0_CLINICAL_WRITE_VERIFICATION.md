# RC212 — P0 Clinical Write Verification

This hardening release strengthens authoritative Supabase confirmation for the core clinical relationships.

- Patient samples perform a fresh Supabase read-back after relational laboratory result synchronization and verify surveillance, parent and root sample links.
- Patient-sample, surveillance-case and patient-isolation deletes use tenant-scoped `delete().select('id')` and fail if Supabase does not return the deleted record.
- Production isolation hydration/save/delete compatibility-cache writes are allowed only inside `withProductionCacheWrite()` after authoritative Supabase operations.
- Production sample and isolation saves return `_persisted: true` only after verification.
- Existing database-level relationship guards remain authoritative for sample/isolation to surveillance-case patient and organization integrity.

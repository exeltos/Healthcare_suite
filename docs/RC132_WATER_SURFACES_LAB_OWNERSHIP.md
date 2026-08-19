# RC132 — Water / Surfaces laboratory ownership

- Localized date fields visually aligned with the rest of Laboratory workspace.
- Water/Surfaces collection mode owns sampling fields only.
- Receipt, acceptance/rejection, final result, organisms, resistance, critical result and antibiogram are read-only outside Laboratory.
- Laboratory result editing for environmental samples is limited to laboratory/admin roles.
- Supabase source-sample writes are verified with a read-back before UI success.
- Migration 20260819_000031 adds source-aware RLS and database-level result-field ownership.

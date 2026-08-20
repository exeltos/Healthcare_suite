# Healthcare Suite rc.174 — Department Master Data Hardening

## What changed
- In Production, `departments` is now the single source of truth for departments.
- Demo/default department values are no longer merged into Production master data.
- Management Center > Libraries & Settings > Departments reads/writes `public.departments`.
- The Departments empty state clearly shows when Supabase has no departments and prompts creation.
- Generic `master_data_libraries` persistence no longer stores a duplicate departments library.
- Department list, save and delete operations are explicitly organization-scoped.
- Department writes are verified after Supabase save.

## Why
The Production `departments` table was empty, but legacy/default master data could still make values such as “ΜΕΘ” appear in selectors. This caused employee save to fail because no real Supabase department row existed.

## Verification
- Department master data audit: 8/8 PASS
- Form Actions / WHO: 8/8 PASS
- Supabase readiness: 10/10 PASS
- Governance visibility: 16/16 PASS

## Production test
1. Open Management Center > Libraries & Settings > Departments.
2. Create `ΜΕΘ` (for example code `ICU`).
3. Confirm it appears in Supabase `public.departments`.
4. Open an employee and select `ΜΕΘ`.
5. Save, refresh, and confirm the department remains.
6. Verify the employee row has the new `department_id`.
7. Add a vaccination and verify `prevention_records.department_id` inherits the employee department.

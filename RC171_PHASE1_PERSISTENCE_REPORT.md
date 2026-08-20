# Healthcare Suite rc.171 — Antimicrobial Navigation + Persistence Phase 1

## Changes
- Records now shows one navigation item: **Antimicrobial Surveillance**.
- The item opens Restricted/Promoted Antibiotics by default.
- Both internal pages retain the two tabs:
  - Restricted/Promoted Antibiotics
  - Antimicrobial Consumption
- Sidebar active state recognizes both internal routes as the same navigation item.
- Existing routes were retained to avoid breaking deep links, permissions and existing references.

## Login feedback
- A generic form submit is no longer automatically treated as a Save action.
- Successful authentication now shows:
  - EL: **Συνδέθηκε** — Η σύνδεση ολοκληρώθηκε.
  - EN: **Connected** — Connected successfully.
- This removes the incorrect “Αποθήκευση” toast after login.

## Production Persistence Hardening — Phase 1
First target: Antimicrobial Consumption / DDD.

Verified statically:
1. DDD create/update uses `saveIndicatorSourceRecordBackend('antibiotic_ddd', row)`.
2. Production save performs Supabase upsert.
3. Save is scoped by organization/source type/record key.
4. The row is read back from Supabase after save.
5. Local UI mirror is updated only after Supabase verification succeeds.
6. Delete uses the Production backend and requires Supabase confirmation.
7. There is no local-success fallback in the DDD save flow when Supabase fails.

Audit: **7/7 PASS**.

## Other current audits
- Form Actions / WHO consistency: **8/8 PASS**
- Governance visibility: **16/16 PASS**
- Supabase static readiness: **10/10 PASS**

## Important
This is a static/code-level Production persistence verification. A real Production Supabase smoke test is still required:
create DDD -> refresh -> verify -> edit -> refresh -> verify -> delete -> refresh -> verify.

The broader application-wide fail-closed browser persistence hardening remains the next persistence task.

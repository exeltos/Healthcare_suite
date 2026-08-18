# Healthcare Suite rc.82 — Functional QA fixes

Fixes implemented from hands-on review before P2 polish.

## Surveillance / Patients
- Hospital days are calculated automatically from admission date to discharge date or today.
- New patient has an explicit Cancel action.
- Patient record uses one vertical scrolling body so Samples, Therapy & Precautions and other sections can reach their full content.

## Surveillance / Employees
- New Employee opens directly in the same full employee workspace used by existing records.
- New Employee has Cancel and Save in the profile card.
- Account editor opened from an employee record returns to the employee record immediately after successful Save.

## Water / Surfaces
- Collection/execution is pending-only.
- The collection user cannot enter laboratory result, microorganism, CFU/ATP or acceptance.
- These fields remain owned by Laboratory.
- Sidebar active state uses return context when a sub-record is opened, preserving the selected Surveillance subcategory.

## Prevention / WHO Hand Hygiene
- Department remains library-driven.
- Observer is selected from active Staff.
- Date and start/end time use native date/time controls.
- All WHO summaries and persisted calculations use the shared `calculateWhoCompliance` metric.
- Successful WHO save closes the entry card.
- Persistence remains through the Prevention backend service.

## Regression
Run:
`npm run audit:functional-qa`
Expected: 17/17.

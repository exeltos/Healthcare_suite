# Healthcare Suite rc.83

## Fixed after visual QA

### Patient workspace scrolling
The patient workspace no longer creates a nested internal scroll area. The application content area is the single vertical scroll owner, so Samples, Treatment & Precautions, EODY and other patient sections can reach their full content while the application footer remains outside the scroll region.

### Consistent Save / Cancel
Create/edit surfaces now follow one action rule:
- `Ακύρωση / Cancel`
- `Αποθήκευση / Save`

Entry-form headers show an explicit Cancel button rather than an anonymous X.
Duplicate top-right close controls were removed when the same editor already has Cancel/Save actions.

Covered in this pass:
- Patient registry edit/new
- Patient sample editor
- Patient EODY notification editor
- Employee profile edit/new
- New Entry / WHO launcher
- Form Designer editor
- Bundle execution editor

View-only drawers may still use Close/X because there is nothing to save.

### WHO Hand Hygiene
- Metrics now preview the current complete opportunity immediately.
- Professionals, opportunities, HR, HW, missed and compliance update live.
- A complete visible opportunity is automatically included when the user presses Save, even if they did not separately press “Add opportunity”.
- Existing saved opportunities and the current draft use the same `calculateWhoCompliance` function.
- The button is now labelled “Προσθήκη ευκαιρίας / Add opportunity”.

## Regression
- Functional QA: 17/17
- Form action / WHO consistency: 8/8
- Governance visibility: 16/16
- Deployment readiness: 0 findings / 0 blockers

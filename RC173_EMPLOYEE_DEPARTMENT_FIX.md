# rc.173 — Employee Department Persistence Fix

## Root cause
The Employee workspace used `onValueChange` on `LibraryField` for:
- Professional category
- Department
- Vaccination vaccine selector

`LibraryField` exposes `onChange`, so the selected value was visible in the control but was not reliably written into the Employee form state. As a result, Employee save could receive an empty/stale department value and Supabase `employees.department_id` remained unchanged/null.

## Fix
- Replaced the incorrect Employee `LibraryField` callbacks with `onChange`.
- Kept SmartDateInput `onValueChange` callbacks unchanged (they are correct for that component).
- Employee Supabase save now returns `department_id` in its read-back selection.
- Added explicit verification that the saved `department_id` equals the resolved department.
- Added verification that the returned department name matches the selected library value.
- Vaccination persistence from rc.172 can now inherit the employee department correctly.

## Audits
- Employee department persistence: 7/7 PASS
- Form Actions / WHO consistency: 8/8 PASS
- Supabase static readiness: 10/10 PASS

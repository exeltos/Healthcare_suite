# rc.172 — Staff Vaccination Persistence Hardening

- Staff vaccination now resolves the employee from the current organization with `department_id` and department relation.
- If the form does not provide a department, the employee's current department is inherited.
- `prevention_records.department_id` is now persisted for staff vaccinations instead of being forced to NULL.
- `data.department` is populated from the employee's department name when missing.
- Empty vaccination status is normalized to `recorded`.
- Supabase read-back verification checks employee link, department link and status.
- Existing duplicate-vaccination and inactive-employee guards remain.

Audit: 7/7 PASS.

Production verification recommended:
create a vaccination for an employee assigned to a department, then verify `employee_id`, `department_id`, `record_date`, `status='recorded'` and `data.department` in `prevention_records`.

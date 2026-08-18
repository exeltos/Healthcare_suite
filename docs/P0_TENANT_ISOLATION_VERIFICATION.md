# P0 Tenant / Role Isolation Verification

Run after applying migration `20260818_000027_tenant_role_isolation_hardening.sql` and deploying the current Edge Functions.

1. Create Organization A and Organization B with separate active administrators.
2. As Admin A, confirm Organization B users, staff, departments and records are not selectable/readable.
3. Invoke `admin-user-account` as Admin A with an Organization B `employeeId`; expect HTTP 400.
4. Invoke it with an Organization B `departmentId`; expect HTTP 400.
5. Invoke it with an unsupported role or capability; expect HTTP 400.
6. Invoke it without a Bearer token; expect HTTP 401. Invoke as a non-admin; expect HTTP 403.
7. Confirm direct authenticated INSERT/UPDATE/DELETE on `user_profiles` and `user_department_access` is denied.
8. Confirm updating a profile's `user_id` or `organization_id` is rejected by the database guard even through a trusted/service context.
9. Confirm the last active administrator cannot be demoted, disabled or deleted.
10. Confirm a legitimate same-organization create/update still succeeds and its selected department scope is preserved.

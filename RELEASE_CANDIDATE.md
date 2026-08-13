# Healthcare Suite / Limoxis Observer — v0.12.0-rc.1

## Release Candidate status
This build passed the project's static release audits for navigation, architecture, integration boundaries, UI consistency, design system, workflows, i18n, security/RLS alignment, clinical integrity, staff integrity, quality workflows, committees/documents and Management Center integrity.

## Header EL/EN stability
The right side of the application header now has fixed geometry for desktop. Changing between Greek and English no longer changes the position of Accessibility, Notifications or the user control. User name/role text truncates inside a fixed-width profile control when necessary. Mobile keeps the compact adaptive behavior.

## Production migrations
Apply all migrations in order through:
- 20260813_000009_role_permission_rls_alignment.sql
- 20260813_000010_clinical_relationship_integrity.sql
- 20260813_000011_staff_health_training_integrity.sql
- 20260813_000012_quality_workflow_integrity.sql
- 20260813_000013_committees_documents_integrity.sql
- 20260813_000014_management_center_integrity.sql

## Final go-live verification
On the target machine/deployment:
1. Set Production environment variables explicitly, including VITE_APP_MODE=production and Supabase configuration.
2. Run npm install.
3. Run npm run check.
4. Run npm run build.
5. Apply Supabase migrations through 000014.
6. Test one real account for each required role, plus one Demo session.
7. Smoke-test create/read/update/delete where allowed for Patient, Laboratory, Staff, Quality and Management Center.
8. Confirm private attachments cannot be opened by an unauthorized user.

The browser-local repositories intentionally remain as Demo/cache compatibility layers. Production write paths are guarded by the backend/integration audits and must not silently fall back to browser-only persistence.

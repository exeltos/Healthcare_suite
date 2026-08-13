# Healthcare Suite — Runtime & Supabase foundation

## Demo mode

```env
VITE_APP_MODE=demo
VITE_AUTH_PROVIDER=demo-session
VITE_DATA_PROVIDER=browser-local
```

Demo mode remains completely separate from production and may use browser-local data.
Do not use real patient or employee data in Demo mode.

## Production mode

```env
VITE_APP_MODE=production
VITE_AUTH_PROVIDER=supabase
VITE_DATA_PROVIDER=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_AUTH_REDIRECT_URL=https://your-domain.example/login
```

The browser uses only the Supabase publishable key. Never expose a secret/service-role key in the React application.

Production authentication now uses Supabase password authentication and validates the active Supabase session before rendering protected routes. The cached Healthcare Suite session is only presentation state; it is not trusted as proof of authentication.

## Database foundation included

Migration:

`supabase/migrations/20260813_000001_core_identity_rls_storage.sql`

It creates:

- organizations
- departments
- employees
- user_profiles
- user_department_access
- private attachment metadata
- RLS helper functions
- `get_my_context()` for the authenticated React session
- a private `healthcare-attachments` Storage bucket and conservative Storage policies

## Initial administrator

1. Create the first Auth user from the Supabase Dashboard.
2. Copy that user's UUID.
3. In the SQL Editor run:

```sql
select public.bootstrap_first_admin(
  'AUTH_USER_UUID'::uuid,
  'Hospital Name',
  'hospital-slug',
  'Administrator Name',
  'administrator'
);
```

The bootstrap function cannot be executed by normal `anon` or `authenticated` clients.

## User invitation foundation

An Edge Function is included:

`supabase/functions/admin-create-user/index.ts`

It checks that the caller is an application administrator, derives the organization from the caller, sends the Auth invitation server-side, and creates the Healthcare Suite profile. The service-role key remains inside the Edge Function environment.

The current Studio Users screen has not yet been migrated to this function; that is the next repository/UI migration step.

## Attachments

The private Storage path convention is:

`organization_id / auth_user_id / entity_type / entity_id / filename`

The included policies currently allow the uploader and application administrators to read/delete files. Shared clinical-record access will be expanded only when each module repository is migrated, to avoid prematurely exposing files.

## Still local in this version

Clinical repositories (patients, surveillance, laboratory, quality, training, committees, documents, etc.) still use the existing local repository adapters. They must be migrated module-by-module to Supabase before real clinical use.

Run:

```bash
npm run audit:deployment
```

before any production deployment.


## v0.9.9 — Production directory now connected

In Production mode the following areas now use Supabase as their source of truth:

- Departments in Libraries & Settings
- Staff / Employees
- User accounts and access scope
- Occupational-health visits in a separate protected table

The application may keep a browser-local compatibility cache so modules not yet migrated can resolve staff/department names, but writes for the areas above go to Supabase first.

### Occupational-health privacy

Occupational-health visits are intentionally stored separately from the general employee directory. RLS restricts them to:

- Administrator
- Infection Control Lead
- Medical Reviewer

This prevents training/committee/staff-directory access from automatically exposing occupational-health records.

### User administration Edge Function

Deploy:

`supabase/functions/admin-user-account/index.ts`

This function handles secure production account creation/update/delete with the service-role key on the server side. New production accounts receive a Supabase Auth invitation automatically when saved from Studio → Users.

### Upgrade from v0.9.8

If the first core migration was already applied, also apply:

`supabase/migrations/20260813_000002_directory_upgrade.sql`

The next backend migration target is Patients / Surveillance / Laboratory.


## v0.10.0 — Clinical core migration

Production mode now uses Supabase for:

- Patient registry
- Patient surveillance cases
- Patient laboratory samples/results
- Infection records
- Patient/Laboratory workspace lifecycle synchronization

Migration:

`supabase/migrations/20260813_000003_clinical_core.sql`

The existing clinical workflow rules remain the single lifecycle boundary. In Production mode the workflow hydrates its context from Supabase, applies the same positive/negative/recheck rules, and persists the resulting sample, surveillance case and infection back to Supabase.

### Intentionally not claimed as complete yet

The following supporting areas still require backend migration before go-live:

- Staff laboratory samples
- Environmental samples
- Water samples
- Patient isolations
- Patient attachments / files
- Notifiable diseases
- Remaining Quality / Training / Committees / Documents repositories

Therefore `audit:deployment` must still fail until the remaining browser-local repositories have been removed from Production mode.


## v0.10.1 — Clinical support backend

Production mode additionally persists to Supabase:

- Staff laboratory samples
- Environmental laboratory samples
- Water laboratory records
- Patient isolation episodes
- Patient attachment metadata
- Notifiable diseases

Patient file binaries use the private `patientattachments` Supabase Storage bucket. Storage paths are organization/patient scoped and governed by RLS.

Migration:

`supabase/migrations/20260813_000004_clinical_support.sql`

The Laboratory list/workspace now combines patient and non-patient sources from the production backend rather than mixing Supabase patient samples with browser-local staff/environment/water records.

Remaining deployment work is primarily organizational/operational repositories (Quality, Training, Committees, Documents and related modules).


## v0.10.2 — Quality core backend

Production mode now persists the core Quality workflow to Supabase:

- Incidents / near misses
- CAPA / improvement actions
- Audit executions, answers and findings
- Cross-links from incidents/audits to CAPA

Migration:

`supabase/migrations/20260813_000005_quality_core.sql`

The existing Quality workflow rules remain in place, including effectiveness verification before CAPA closure. The backend adds organization/department scope and RLS without changing the Quality navigation.

Indicators are intentionally not duplicated as static database rows where they are calculated from source data. Their remaining settings/source repositories are part of the next operational migration.


## v0.10.3 — Indicators & organization backend

Production mode now additionally persists to Supabase:

- Indicator settings / targets
- Custom indicators
- Indicator source records (daily census, antibiotic DDD, structural snapshots, prevalence snapshots)
- Training records
- Committees / meetings / agenda data
- Controlled documents and version metadata

Migration:

`supabase/migrations/20260813_000006_operational_core.sql`

The calculated indicator engine remains unchanged: values are still calculated from their source records rather than stored as arbitrary static KPI values. The production backend hydrates the existing calculation engine before the Indicators UI renders.

Training, Committees and Documents keep the existing frontend workflow but use Supabase as the Production source of truth.

### Remaining browser-local areas after v0.10.3

The main remaining production migrations are:

- Prevention datasets (WHO hand hygiene, staff vaccination and related prevention records)
- Form Designer / form templates
- Studio configuration and selected master-data libraries
- Hybrid/support repositories that have not yet received explicit Production adapters
- File binaries embedded inside some organizational attachment structures should later move to private Storage rather than JSON metadata

These remain deployment blockers until a final production-boundary audit confirms that Production mode cannot write real data only to the browser.


## v0.10.4 — Prevention, Forms & Studio backend

Production persistence now includes:

- WHO hand-hygiene observation sessions
- Staff vaccination records
- Promoted-antibiotic approval records
- Bundles / prevention records
- Antiseptic consumption
- Waste measurements
- Prevention audit records
- Form Designer templates
- Dynamic form responses
- Studio configuration
- Master-data libraries

Migration:

`supabase/migrations/20260813_000007_prevention_forms_studio.sql`

Existing browser repositories are retained only as demo/runtime cache compatibility layers. Production UI entry points introduced in this pass hydrate from Supabase and persist through explicit backend adapters.

The next pass should be a final write-path audit rather than another feature migration: locate any remaining Production action that still calls a synchronous local repository directly, migrate it, validate user administration/server functions, validate private organizational attachment binaries, and then perform the go-live security/configuration checklist.


## v0.10.5 — Final Production Write-Path Hardening

Final production review migrated the remaining known direct browser-only write paths for:

- Surveillance control programs and executions
- Laboratory records created by surveillance-control executions
- Bundle/checklist dynamic responses
- Prevention audits
- Role-permission configuration
- Manual master-data additions from shared library fields
- Studio reset/save actions

Migration:

`supabase/migrations/20260813_000008_final_production_hardening.sql`

The deployment audit now explicitly fails if these UI entry points regress to synchronous local-only writes. User creation/deletion/reset already uses the Supabase Auth admin Edge Function boundary in Production.

Browser storage remains available for Demo mode and as an in-session compatibility cache. It is not the intended Production source of truth.

Before real deployment, infrastructure steps still remain: apply all migrations, deploy Edge Functions, configure environment variables, create/verify the first administrator, and execute RLS/auth/storage smoke tests against the target Supabase project.

## v0.10.6 — Navigation & UI Consistency Hardening

- Unified sidebar destinations behind `APP_ROUTES` and added explicit canonical Laboratory routes for Water, Environment and Staff views.
- Preserved legacy surveillance/water URLs only as compatibility redirects to the canonical Laboratory views.
- Removed hard-coded internal `navigate('/…')` calls and full-page `window.location.assign()` navigation from operational screens.
- Added `audit:navigation` to protect every sidebar destination against missing route coverage and future hard-coded navigation regressions.
- Migrated Form Designer and Bundles actions to shared `Button`, `IconButton` and `Tabs` primitives where appropriate.
- Reduced raw button debt from 145 to 127 and hard-coded CSS color debt from 958 to 882 without relaxing audit thresholds.
- Normalized redundant CSS token fallbacks where the global theme already guarantees the token.

## v0.11.0 — Production write-path audit

A production hardening pass removed remaining browser-local mutating calls from the active Patient Workflow for isolations, notifiable diseases, attachments, surveillance cleanup and sample deletion. Employee bulk vaccination/training actions now use the Production-aware backend services as well.

`audit:deployment` now contains explicit guards for these high-risk UI write paths so a future direct local mutation becomes a deployment blocker.

Browser-local repositories remain intentionally available for Demo mode and compatibility hydration. They are not, by themselves, proof of a Production write path.

## v0.11.1 — Authentication, Roles & RLS alignment

Production authorization now uses one effective module-access model across the authenticated session, sidebar visibility, route access and Supabase RLS.

Key hardening:
- the current user's effective role matrix is exposed through the safe `get_my_module_access()` RPC;
- sidebar items that the user cannot view are removed;
- direct URL navigation to unauthorized modules is redirected;
- create/edit/delete are distinct permissions instead of one generic "write" permission;
- Laboratory can view related patient data without inheriting patient-registry write access;
- Quality access for department users requires the explicit Quality capability;
- Training, Committees and Documents capabilities no longer implicitly grant write access to each other;
- Staff and Documents optional capabilities are explicit;
- critical RLS policies use action-specific INSERT/UPDATE/DELETE rules, preventing view-only users from deleting records through the API;
- patient attachment metadata and Storage are patient/department scoped;
- the fresh-install `is_current_admin()` migration typo was corrected to `is_app_admin()`.

Apply migrations through `20260813_000009_role_permission_rls_alignment.sql` before using this frontend in Production.

## v0.11.3 — Clinical workflow integrity

The Patient and Laboratory patient-sample paths continue to use the same clinical workflow boundary. Recheck lineage is now stricter: a follow-up sample cannot be attached to a different surveillance episode than its parent.

A negative follow-up no longer automatically closes an already active, laboratory-confirmed surveillance episode. It is recorded as a negative recheck while the episode remains active until the clinical Reassessment & Outcome step closes it. Positive rechecks remain in the existing episode and do not create duplicate infection records.

## v0.11.4 — Therapy, approval & isolation integrity

Antimicrobial therapy mutations are persisted to the surveillance episode before restricted-antibiotic synchronization. Approval decisions made in Prevention are written back to the linked surveillance case in Production, preventing local-only approval state.

Isolation records now reject an end date before the start date, and an isolation with an end date cannot remain marked active.

## v0.11.5 — Current-state clinical signals & KPI integrity

Patient header signals are now derived from active surveillance episodes instead of historical closed-case samples. Historical positive/MDR-XDR-PDR results remain in the clinical record and timeline but no longer keep the current patient header falsely positive or resistant after the episode has closed.

Active isolation badges require an actually active isolation associated with a current episode. Dashboard laboratory KPIs are scoped to currently admitted patients, preventing discharged historical records from inflating the operational snapshot.

## v0.11.6 — Reassessment & clinical episode closure

Reassessment & Outcome now has an explicit clinical closure action. Closing an episode requires a reassessment date and outcome, locks the surveillance episode as closed, completes linked infection records and ends active isolation records using the closure date. Historical samples, therapies, infections and isolation records remain available in the patient timeline.

Closure is centralized in `closeClinicalSurveillanceEpisode()` so Patient UI and future workflows do not implement competing lifecycle rules.

## v0.11.7 — Laboratory ↔ Patient reconciliation & orphan protection

Laboratory result edits are now bidirectional. When a previously positive patient sample is revised to negative or pending, its automatically generated infection is retracted and the sample-to-infection link is cleared. If the same sample later becomes positive again, the existing retracted infection is reactivated rather than duplicated.

Auto-created surveillance episodes are closed when a previously positive result becomes pending; a later positive correction reopens the same episode while moving the previous close marker into closure history. Deleting a patient sample now uses the shared clinical workflow: auto-generated infections are cleaned up, empty auto-generated surveillance episodes are removed, while clinically enriched episodes are preserved and returned to awaiting-laboratory state.

Patient creation from Laboratory checks duplicate patient code/AMKA, Production additionally checks AMKA before saving, and migration `20260813_000010_clinical_relationship_integrity.sql` adds database-level patient/sample/infection/isolation relationship guards plus a first-class surveillance foreign key for isolation.

## v0.11.8 — Staff health & training integrity

Staff vaccination deletion now uses the same Production backend as creation/editing. New vaccination and training assignments are limited to active registry employees, while historical records for inactive staff remain visible.

Production validates employee identity, rejects duplicate employee codes, validates vaccination employee ownership and duplicate vaccine/date identity, prevents occupational-health review dates before the visit, validates training validity chronology and duplicate attendance, and rejects cross-organization employee relationships.

Apply migration `20260813_000011_staff_health_training_integrity.sql`.

## v0.11.9 — Quality workflow integrity

Incident → Audit → CAPA relationships now use Production-aware services. Duplicate active incident CAPA creation is blocked, audit finding CAPA retains the finding as parent, and Production validates source ownership. Apply `20260813_000012_quality_workflow_integrity.sql`.

## v0.11.10 — Committees & controlled documents integrity

Committee membership, attendance, meeting/action chronology and duplicate names are validated in Production. Controlled documents validate code identity, publication attachments and version history. Apply `20260813_000013_committees_documents_integrity.sql`.

## v0.11.11 — Management Center integrity

Users, roles, department scopes and Studio/master-data configuration are now tenant-scoped and structurally validated. Production enforces one valid staff link per account and rejects invalid selected departments before the admin edge function. Apply `20260813_000014_management_center_integrity.sql`.

## v0.12.0-rc.1 — Release Candidate

Desktop header geometry is stable across Greek/English language changes. The final release-candidate audit checks exact duplicate source files, direct browser-storage leakage, console logging, hard-coded internal routes and header language stability.

All static release audits pass with zero blockers. Final release approval requires a clean `npm run check` and `npm run build` on an environment where npm dependencies are installed, plus application of Supabase migrations through `20260813_000014_management_center_integrity.sql`.

## v0.12.0-rc.4 — Production clean-data boundary

Operational sample/default records are now Demo-only. Production mode does not seed default employees, patient samples, notifiable-disease cases, quality incidents/CAPA, surveillance-control programs, mock patients or mock patient cases. Successful Production authentication and session restoration clear stale browser-local operational caches before Supabase hydration.

Reference dictionaries and clinical configuration defaults remain code-level configuration where appropriate; they are not operational patient/staff/audit records.

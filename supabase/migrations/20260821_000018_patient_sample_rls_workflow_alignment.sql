
begin;

-- Patient samples are created from both the patient workflow and the laboratory.
-- Result finalization remains laboratory-controlled.

drop policy if exists patient_samples_write_scoped on public.patient_samples;
drop policy if exists patient_samples_select_scoped on public.patient_samples;
drop policy if exists patient_samples_insert_scoped on public.patient_samples;
drop policy if exists patient_samples_update_scoped on public.patient_samples;
drop policy if exists patient_samples_delete_scoped on public.patient_samples;

create policy patient_samples_select_scoped
on public.patient_samples
for select
to authenticated
using (
  organization_id = public.current_organization_id()
  and (
    public.has_module_access('Ασθενείς',false)
    or public.has_module_access('Εργαστήριο',false)
  )
  and (
    department_id is null
    or public.can_access_clinical_department(department_id)
  )
);

create policy patient_samples_insert_scoped
on public.patient_samples
for insert
to authenticated
with check (
  organization_id = public.current_organization_id()
  and (
    public.has_module_access('Ασθενείς',true)
    or public.has_module_access('Εργαστήριο',true)
  )
  and (
    department_id is null
    or public.can_access_clinical_department(department_id)
  )
  -- Samples created outside Laboratory must enter as pending.
  and (
    public.has_module_access('Εργαστήριο',true)
    or status = 'Εκκρεμεί'
  )
);

create policy patient_samples_update_scoped
on public.patient_samples
for update
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.has_module_access('Εργαστήριο',true)
  and (
    department_id is null
    or public.can_access_clinical_department(department_id)
  )
)
with check (
  organization_id = public.current_organization_id()
  and public.has_module_access('Εργαστήριο',true)
  and (
    department_id is null
    or public.can_access_clinical_department(department_id)
  )
);

create policy patient_samples_delete_scoped
on public.patient_samples
for delete
to authenticated
using (
  organization_id = public.current_organization_id()
  and (
    public.has_module_access('Ασθενείς',true)
    or public.has_module_access('Εργαστήριο',true)
  )
  and (
    department_id is null
    or public.can_access_clinical_department(department_id)
  )
);

commit;

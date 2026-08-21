
begin;

alter table public.patient_isolations
  add column if not exists surveillance_case_id text references public.surveillance_cases(id) on delete set null,
  add column if not exists pathogen text not null default '';

update public.patient_isolations
set pathogen = coalesce(nullif(data->>'pathogen',''),'')
where pathogen = '';

create index if not exists patient_isolations_org_case_idx
  on public.patient_isolations(organization_id,surveillance_case_id);

drop policy if exists patient_isolations_scoped on public.patient_isolations;
drop policy if exists patient_isolations_select_scoped on public.patient_isolations;
drop policy if exists patient_isolations_insert_scoped on public.patient_isolations;
drop policy if exists patient_isolations_update_scoped on public.patient_isolations;
drop policy if exists patient_isolations_delete_scoped on public.patient_isolations;

create policy patient_isolations_select_scoped
on public.patient_isolations for select to authenticated
using (
  organization_id=public.current_organization_id()
  and public.has_module_access('Ασθενείς',false)
  and (department_id is null or public.can_access_clinical_department(department_id))
);

create policy patient_isolations_insert_scoped
on public.patient_isolations for insert to authenticated
with check (
  organization_id=public.current_organization_id()
  and public.has_module_access('Ασθενείς',true)
  and (department_id is null or public.can_access_clinical_department(department_id))
);

create policy patient_isolations_update_scoped
on public.patient_isolations for update to authenticated
using (
  organization_id=public.current_organization_id()
  and public.has_module_access('Ασθενείς',true)
  and (department_id is null or public.can_access_clinical_department(department_id))
)
with check (
  organization_id=public.current_organization_id()
  and public.has_module_access('Ασθενείς',true)
  and (department_id is null or public.can_access_clinical_department(department_id))
);

create policy patient_isolations_delete_scoped
on public.patient_isolations for delete to authenticated
using (
  organization_id=public.current_organization_id()
  and public.has_module_access('Ασθενείς',true)
  and (department_id is null or public.can_access_clinical_department(department_id))
);

commit;

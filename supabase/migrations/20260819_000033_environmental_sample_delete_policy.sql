-- Healthcare Suite rc.136
-- Water / Surfaces users who have delete permission for their module may delete
-- their own source records. Laboratory retains source-wide governance access.
begin;

drop policy if exists laboratory_source_samples_delete on public.laboratory_source_samples;

create policy laboratory_source_samples_delete
on public.laboratory_source_samples
for delete
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.can_manage_laboratory_source_sample(source_type,'delete')
  and (department_id is null or public.can_access_clinical_department(department_id))
);

commit;
notify pgrst, 'reload schema';

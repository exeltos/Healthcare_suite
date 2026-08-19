-- Healthcare Suite rc.137
-- Self-contained source-aware helper + DELETE policy for Water / Surfaces laboratory samples.
-- Safe to run even when migration 000031 was not previously applied.
begin;

create or replace function public.can_manage_laboratory_source_sample(
  sample_source text,
  requested_action text
)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case
    when sample_source='Νερό' then
      public.has_module_action('Νερό', requested_action)
      or public.has_module_action('Εργαστήριο', requested_action)
    when sample_source in ('Περιβάλλον','Επιφάνεια') then
      public.has_module_action('Επιφάνειες', requested_action)
      or public.has_module_action('Εργαστήριο', requested_action)
    else
      public.has_module_action('Εργαστήριο', requested_action)
  end
$$;

revoke all on function public.can_manage_laboratory_source_sample(text,text) from public, anon;
grant execute on function public.can_manage_laboratory_source_sample(text,text) to authenticated;

drop policy if exists laboratory_source_samples_delete on public.laboratory_source_samples;

create policy laboratory_source_samples_delete
on public.laboratory_source_samples
for delete
to authenticated
using (
  organization_id = public.current_organization_id()
  and public.can_manage_laboratory_source_sample(source_type, 'delete'::text)
  and (department_id is null or public.can_access_clinical_department(department_id))
);

commit;
notify pgrst, 'reload schema';

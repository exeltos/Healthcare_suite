-- Healthcare Suite rc.132
-- Water / surface collection is owned by surveillance workflows; laboratory-only
-- fields are finalized by Laboratory. RLS remains source-aware and the database
-- protects result fields even if a client bypasses the UI.
begin;

-- Environmental source records need a genuine pending acceptance state until
-- Laboratory receives and evaluates the specimen.
alter table public.laboratory_source_samples
  alter column sample_acceptance set default 'Εκκρεμεί';

alter table public.laboratory_source_samples
  drop constraint if exists laboratory_source_samples_acceptance_check;
alter table public.laboratory_source_samples
  add constraint laboratory_source_samples_acceptance_check
  check (sample_acceptance in ('Εκκρεμεί','Αποδεκτό','Απορρίφθηκε'));

create or replace function public.can_manage_laboratory_source_sample(sample_source text, requested_action text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select case
    when sample_source='Νερό' then
      public.has_module_action('Νερό',requested_action)
      or public.has_module_action('Εργαστήριο',requested_action)
    when sample_source='Περιβάλλον' then
      public.has_module_action('Επιφάνειες',requested_action)
      or public.has_module_action('Εργαστήριο',requested_action)
    else public.has_module_action('Εργαστήριο',requested_action)
  end
$$;

create or replace function public.can_finalize_environmental_laboratory_result()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(public.current_app_role() in ('laboratory','admin'),false)
$$;

create or replace function public.protect_environmental_laboratory_fields()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if new.source_type not in ('Νερό','Περιβάλλον')
     or public.can_finalize_environmental_laboratory_result() then
    return new;
  end if;

  if tg_op='INSERT' then
    new.received_date := null;
    new.result_date := null;
    new.status := 'Εκκρεμεί';
    new.microorganism := '';
    new.resistance := '';
    new.sample_acceptance := 'Εκκρεμεί';
    new.rejection_reason := '';
    new.validated_at := null;
    new.validated_by := null;
    new.critical_result := false;
    new.critical_communicated_to := '';
    new.critical_communicated_at := null;
    new.critical_communicated_by := null;
    new.data := coalesce(new.data,'{}'::jsonb)
      - array['resultNotes','validatedBy','criticalCommunicatedBy','antibiogram','microorganismResults','microorganisms'];
    return new;
  end if;

  if new.received_date is distinct from old.received_date
     or new.result_date is distinct from old.result_date
     or new.status is distinct from old.status
     or new.microorganism is distinct from old.microorganism
     or new.resistance is distinct from old.resistance
     or new.sample_acceptance is distinct from old.sample_acceptance
     or new.rejection_reason is distinct from old.rejection_reason
     or new.validated_at is distinct from old.validated_at
     or new.validated_by is distinct from old.validated_by
     or new.critical_result is distinct from old.critical_result
     or new.critical_communicated_to is distinct from old.critical_communicated_to
     or new.critical_communicated_at is distinct from old.critical_communicated_at
     or new.critical_communicated_by is distinct from old.critical_communicated_by
     or (new.data->'resultNotes') is distinct from (old.data->'resultNotes')
     or (new.data->'validatedBy') is distinct from (old.data->'validatedBy')
     or (new.data->'criticalCommunicatedBy') is distinct from (old.data->'criticalCommunicatedBy')
     or (new.data->'antibiogram') is distinct from (old.data->'antibiogram')
     or (new.data->'microorganismResults') is distinct from (old.data->'microorganismResults')
     or (new.data->'microorganisms') is distinct from (old.data->'microorganisms') then
    raise exception 'Water/surface laboratory result fields can only be changed by Laboratory.';
  end if;

  return new;
end
$$;

drop trigger if exists environmental_laboratory_field_ownership_guard on public.laboratory_source_samples;
create trigger environmental_laboratory_field_ownership_guard
before insert or update on public.laboratory_source_samples
for each row execute function public.protect_environmental_laboratory_fields();

-- Source-aware RLS: surveillance roles may manage collection records from their
-- own Water/Surfaces modules; Laboratory can manage all source samples.
drop policy if exists laboratory_source_samples_select on public.laboratory_source_samples;
drop policy if exists laboratory_source_samples_insert on public.laboratory_source_samples;
drop policy if exists laboratory_source_samples_update on public.laboratory_source_samples;

create policy laboratory_source_samples_select on public.laboratory_source_samples for select to authenticated
using (
  organization_id=public.current_organization_id()
  and public.can_manage_laboratory_source_sample(source_type,'view')
  and (department_id is null or public.can_access_clinical_department(department_id))
);

create policy laboratory_source_samples_insert on public.laboratory_source_samples for insert to authenticated
with check (
  organization_id=public.current_organization_id()
  and public.can_manage_laboratory_source_sample(source_type,'create')
  and (department_id is null or public.can_access_clinical_department(department_id))
);

create policy laboratory_source_samples_update on public.laboratory_source_samples for update to authenticated
using (
  organization_id=public.current_organization_id()
  and public.can_manage_laboratory_source_sample(source_type,'edit')
  and (department_id is null or public.can_access_clinical_department(department_id))
)
with check (
  organization_id=public.current_organization_id()
  and public.can_manage_laboratory_source_sample(source_type,'edit')
  and (department_id is null or public.can_access_clinical_department(department_id))
);

revoke all on function public.can_manage_laboratory_source_sample(text,text) from public,anon;
revoke all on function public.can_finalize_environmental_laboratory_result() from public,anon;
grant execute on function public.can_manage_laboratory_source_sample(text,text) to authenticated;
grant execute on function public.can_finalize_environmental_laboratory_result() to authenticated;

commit;
notify pgrst, 'reload schema';

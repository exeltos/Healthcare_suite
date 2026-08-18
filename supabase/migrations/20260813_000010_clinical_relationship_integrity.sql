-- Clinical relationship integrity: prevent cross-patient links and deterministic duplicate identities.
begin;

-- AMKA is optional, but when present it must identify one patient per organization.
do $$
begin
  if exists (
    select 1
    from public.patients
    where nullif(btrim(amka),'') is not null
    group by organization_id,btrim(amka)
    having count(*)>1
  ) then
    raise exception 'Duplicate non-empty AMKA values exist in patients. Resolve duplicates before applying clinical integrity migration.';
  end if;
end
$$;

create unique index if not exists patients_org_amka_unique
  on public.patients(organization_id,btrim(amka))
  where nullif(btrim(amka),'') is not null;

-- Isolation now has a first-class surveillance relationship instead of relying only on JSON data.
alter table public.patient_isolations
  add column if not exists surveillance_case_id text references public.surveillance_cases(id) on delete set null;

update public.patient_isolations i
set surveillance_case_id=i.data->>'clinicalCaseId'
where i.surveillance_case_id is null
  and nullif(i.data->>'clinicalCaseId','') is not null
  and exists (
    select 1
    from public.surveillance_cases sc
    where sc.id=i.data->>'clinicalCaseId'
      and sc.patient_id=i.patient_id
      and sc.organization_id=i.organization_id
  );

create or replace function public.validate_patient_sample_relationships()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.surveillance_case_id is not null and not exists (
    select 1 from public.surveillance_cases sc
    where sc.id=new.surveillance_case_id
      and sc.patient_id=new.patient_id
      and sc.organization_id=new.organization_id
  ) then
    raise exception 'Sample surveillance case must belong to the same patient and organization.';
  end if;

  if new.parent_sample_id is not null then
    if new.parent_sample_id=new.id then
      raise exception 'A sample cannot be its own parent.';
    end if;
    if not exists (
      select 1 from public.patient_samples p
      where p.id=new.parent_sample_id
        and p.patient_id=new.patient_id
        and p.organization_id=new.organization_id
    ) then
      raise exception 'Follow-up parent sample must belong to the same patient and organization.';
    end if;
  end if;

  if nullif(new.root_sample_id,'') is not null and new.root_sample_id<>new.id and not exists (
    select 1 from public.patient_samples r
    where r.id=new.root_sample_id
      and r.patient_id=new.patient_id
      and r.organization_id=new.organization_id
  ) then
    raise exception 'Root sample must belong to the same patient and organization.';
  end if;

  return new;
end
$$;

drop trigger if exists patient_samples_relationship_guard on public.patient_samples;
create trigger patient_samples_relationship_guard
before insert or update of patient_id,organization_id,surveillance_case_id,parent_sample_id,root_sample_id
on public.patient_samples
for each row execute function public.validate_patient_sample_relationships();

create or replace function public.validate_infection_relationships()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.surveillance_case_id is not null and not exists (
    select 1 from public.surveillance_cases sc
    where sc.id=new.surveillance_case_id
      and sc.patient_id=new.patient_id
      and sc.organization_id=new.organization_id
  ) then
    raise exception 'Infection surveillance case must belong to the same patient and organization.';
  end if;

  if new.related_sample_id is not null and not exists (
    select 1 from public.patient_samples ps
    where ps.id=new.related_sample_id
      and ps.patient_id=new.patient_id
      and ps.organization_id=new.organization_id
  ) then
    raise exception 'Infection related sample must belong to the same patient and organization.';
  end if;

  return new;
end
$$;

drop trigger if exists infections_relationship_guard on public.infections;
create trigger infections_relationship_guard
before insert or update of patient_id,organization_id,surveillance_case_id,related_sample_id
on public.infections
for each row execute function public.validate_infection_relationships();

create or replace function public.validate_isolation_relationships()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.surveillance_case_id is not null and not exists (
    select 1 from public.surveillance_cases sc
    where sc.id=new.surveillance_case_id
      and sc.patient_id=new.patient_id
      and sc.organization_id=new.organization_id
  ) then
    raise exception 'Isolation surveillance case must belong to the same patient and organization.';
  end if;

  if new.end_date is not null and new.start_date is not null and new.end_date<new.start_date then
    raise exception 'Isolation end date cannot precede start date.';
  end if;

  return new;
end
$$;

drop trigger if exists patient_isolations_relationship_guard on public.patient_isolations;
create trigger patient_isolations_relationship_guard
before insert or update of patient_id,organization_id,surveillance_case_id,start_date,end_date
on public.patient_isolations
for each row execute function public.validate_isolation_relationships();

commit;

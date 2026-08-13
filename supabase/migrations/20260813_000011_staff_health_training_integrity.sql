-- Staff registry, vaccination, training and occupational-health integrity.
begin;

do $$
begin
  if exists (
    select 1 from public.employees
    where nullif(btrim(employee_code),'') is not null
    group by organization_id,btrim(employee_code)
    having count(*)>1
  ) then
    raise exception 'Duplicate employee codes exist. Resolve them before applying staff integrity migration.';
  end if;
end
$$;

create unique index if not exists employees_org_employee_code_unique
  on public.employees(organization_id,btrim(employee_code))
  where nullif(btrim(employee_code),'') is not null;

alter table public.employee_occupational_visits
  drop constraint if exists employee_occupational_review_date_check;
alter table public.employee_occupational_visits
  add constraint employee_occupational_review_date_check
  check (next_review_date is null or next_review_date>=visit_date);

alter table public.training_records
  drop constraint if exists training_valid_until_check;
alter table public.training_records
  add constraint training_valid_until_check
  check (valid_until is null or training_date is null or valid_until>=training_date);

create or replace function public.validate_staff_prevention_relationships()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.record_type='staff_vaccination' and nullif(new.employee_id,'') is not null then
    if not exists (
      select 1 from public.employees e
      where e.id::text=new.employee_id
        and e.organization_id=new.organization_id
    ) then
      raise exception 'Staff vaccination employee must belong to the same organization.';
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists prevention_staff_relationship_guard on public.prevention_records;
create trigger prevention_staff_relationship_guard
before insert or update of organization_id,record_type,employee_id
on public.prevention_records
for each row execute function public.validate_staff_prevention_relationships();

-- Deterministic duplicate prevention for registry-linked vaccination records.
create unique index if not exists prevention_staff_vaccination_identity_unique
  on public.prevention_records(
    organization_id,
    employee_id,
    record_date,
    (data->>'vaccine')
  )
  where record_type='staff_vaccination'
    and nullif(employee_id,'') is not null
    and record_date is not null
    and nullif(data->>'vaccine','') is not null;

create or replace function public.validate_occupational_employee_relationship()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if not exists (
    select 1 from public.employees e
    where e.id=new.employee_id
      and e.organization_id=new.organization_id
  ) then
    raise exception 'Occupational-health employee must belong to the same organization.';
  end if;
  return new;
end
$$;

drop trigger if exists occupational_employee_relationship_guard on public.employee_occupational_visits;
create trigger occupational_employee_relationship_guard
before insert or update of organization_id,employee_id
on public.employee_occupational_visits
for each row execute function public.validate_occupational_employee_relationship();

commit;

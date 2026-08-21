
begin;

-- Ensure the case has an explicit initial-sample link.
alter table public.surveillance_cases
  add column if not exists initial_sample_id text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'surveillance_cases_initial_sample_id_fkey'
      and conrelid = 'public.surveillance_cases'::regclass
  ) then
    alter table public.surveillance_cases
      add constraint surveillance_cases_initial_sample_id_fkey
      foreign key (initial_sample_id)
      references public.patient_samples(id)
      on delete set null;
  end if;
end $$;

-- Preserve the patient's department as the historical case department when missing.
update public.surveillance_cases sc
set department_id = p.department_id
from public.patients p
where p.id = sc.patient_id
  and p.organization_id = sc.organization_id
  and sc.department_id is null
  and p.department_id is not null;

-- Samples linked to a case inherit the historical case department when missing.
update public.patient_samples ps
set department_id = sc.department_id
from public.surveillance_cases sc
where sc.id = ps.surveillance_case_id
  and sc.organization_id = ps.organization_id
  and ps.department_id is null
  and sc.department_id is not null;

-- Backfill initial_sample_id only when there is exactly one unambiguous initial candidate.
with candidates as (
  select
    sc.organization_id,
    sc.id as case_id,
    min(ps.id) as sample_id,
    count(*) as candidate_count
  from public.surveillance_cases sc
  join public.patient_samples ps
    on ps.organization_id = sc.organization_id
   and ps.patient_id = sc.patient_id
   and ps.surveillance_case_id = sc.id
   and ps.parent_sample_id is null
   and ps.root_sample_id is null
   and ps.category = 'Αρχικό / νέο ανεξάρτητο δείγμα'
  where sc.initial_sample_id is null
  group by sc.organization_id, sc.id
)
update public.surveillance_cases sc
set initial_sample_id = c.sample_id
from candidates c
where c.organization_id = sc.organization_id
  and c.case_id = sc.id
  and c.candidate_count = 1
  and sc.initial_sample_id is null;

create index if not exists surveillance_cases_org_initial_sample_idx
  on public.surveillance_cases(organization_id, initial_sample_id)
  where initial_sample_id is not null;

commit;

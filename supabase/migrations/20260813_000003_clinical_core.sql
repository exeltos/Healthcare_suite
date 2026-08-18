-- Healthcare Suite / Limoxis
-- Patients, surveillance cases, patient laboratory samples and infections.

begin;

create table if not exists public.patients (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_code text not null,
  amka text,
  first_name text not null default '',
  last_name text not null default '',
  father_name text not null default '',
  gender text not null default '',
  age text not null default '',
  department_id uuid references public.departments(id) on delete set null,
  room text not null default '',
  admission_date date,
  admission_time time,
  discharge_date date,
  discharge_time time,
  status text not null default 'Νοσηλεύεται',
  primary_diagnosis text not null default '',
  flags jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, patient_code)
);
create index if not exists patients_org_department_idx on public.patients(organization_id,department_id);
create index if not exists patients_org_status_idx on public.patients(organization_id,status);
create index if not exists patients_org_amka_idx on public.patients(organization_id,amka) where amka is not null and btrim(amka)<>'';

create table if not exists public.surveillance_cases (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id text not null references public.patients(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  status text not null default 'Αναμονή εργαστηρίου',
  workflow_phase text not null default 'awaiting-laboratory',
  laboratory_outcome text not null default 'pending',
  start_date date,
  closed_date date,
  reason text not null default '',
  initial_sample_id text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists surveillance_org_patient_idx on public.surveillance_cases(organization_id,patient_id);
create index if not exists surveillance_org_status_idx on public.surveillance_cases(organization_id,status);

create table if not exists public.patient_samples (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id text not null references public.patients(id) on delete cascade,
  surveillance_case_id text references public.surveillance_cases(id) on delete set null,
  parent_sample_id text references public.patient_samples(id) on delete set null,
  root_sample_id text,
  sample_type text not null default '',
  category text not null default '',
  sample_reason text not null default '',
  collection_date date,
  collection_time time,
  received_date date,
  result_date date,
  status text not null default 'Εκκρεμεί',
  microorganism text not null default '',
  resistance text not null default '',
  department_id uuid references public.departments(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists patient_samples_org_patient_idx on public.patient_samples(organization_id,patient_id);
create index if not exists patient_samples_org_case_idx on public.patient_samples(organization_id,surveillance_case_id);
create index if not exists patient_samples_org_status_idx on public.patient_samples(organization_id,status);
create index if not exists patient_samples_org_resistance_idx on public.patient_samples(organization_id,resistance);

create table if not exists public.infections (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id text not null references public.patients(id) on delete cascade,
  surveillance_case_id text references public.surveillance_cases(id) on delete set null,
  related_sample_id text references public.patient_samples(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  status text not null default 'Υπό διερεύνηση',
  infection_type text not null default '',
  infection_date date,
  microorganism text not null default '',
  resistance text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists infections_org_patient_idx on public.infections(organization_id,patient_id);
create index if not exists infections_org_status_idx on public.infections(organization_id,status);

drop trigger if exists patients_set_updated_at on public.patients;
create trigger patients_set_updated_at before update on public.patients
for each row execute function public.set_updated_at();

drop trigger if exists surveillance_cases_set_updated_at on public.surveillance_cases;
create trigger surveillance_cases_set_updated_at before update on public.surveillance_cases
for each row execute function public.set_updated_at();

drop trigger if exists patient_samples_set_updated_at on public.patient_samples;
create trigger patient_samples_set_updated_at before update on public.patient_samples
for each row execute function public.set_updated_at();

drop trigger if exists infections_set_updated_at on public.infections;
create trigger infections_set_updated_at before update on public.infections
for each row execute function public.set_updated_at();

create or replace function public.can_access_clinical_department(target_department uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.user_profiles p
    where p.user_id=(select auth.uid())
      and p.status='active'
      and (
        p.role in ('admin','infection_lead','medical_reviewer','laboratory')
        or public.has_department_access(target_department)
      )
  )
$$;

create or replace function public.can_manage_clinical()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.user_profiles p
    where p.user_id=(select auth.uid())
      and p.status='active'
      and p.role in ('admin','infection_lead','infection_liaison','medical_reviewer','laboratory','department_user')
  )
$$;

grant execute on function public.can_access_clinical_department(uuid) to authenticated;
grant execute on function public.can_manage_clinical() to authenticated;

alter table public.patients enable row level security;
alter table public.surveillance_cases enable row level security;
alter table public.patient_samples enable row level security;
alter table public.infections enable row level security;

drop policy if exists patients_select_scoped on public.patients;
create policy patients_select_scoped on public.patients for select to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (department_id is null or public.can_access_clinical_department(department_id))
);

drop policy if exists patients_write_scoped on public.patients;
create policy patients_write_scoped on public.patients for all to authenticated
using (
  organization_id=(select public.current_organization_id())
  and public.can_manage_clinical()
  and (department_id is null or public.can_access_clinical_department(department_id))
)
with check (
  organization_id=(select public.current_organization_id())
  and public.can_manage_clinical()
  and (department_id is null or public.can_access_clinical_department(department_id))
);

drop policy if exists surveillance_select_scoped on public.surveillance_cases;
create policy surveillance_select_scoped on public.surveillance_cases for select to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (department_id is null or public.can_access_clinical_department(department_id))
);

drop policy if exists surveillance_write_scoped on public.surveillance_cases;
create policy surveillance_write_scoped on public.surveillance_cases for all to authenticated
using (
  organization_id=(select public.current_organization_id())
  and public.can_manage_clinical()
  and (department_id is null or public.can_access_clinical_department(department_id))
)
with check (
  organization_id=(select public.current_organization_id())
  and public.can_manage_clinical()
  and (department_id is null or public.can_access_clinical_department(department_id))
);

drop policy if exists patient_samples_select_scoped on public.patient_samples;
create policy patient_samples_select_scoped on public.patient_samples for select to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (department_id is null or public.can_access_clinical_department(department_id))
);

drop policy if exists patient_samples_write_scoped on public.patient_samples;
create policy patient_samples_write_scoped on public.patient_samples for all to authenticated
using (
  organization_id=(select public.current_organization_id())
  and public.can_manage_clinical()
  and (department_id is null or public.can_access_clinical_department(department_id))
)
with check (
  organization_id=(select public.current_organization_id())
  and public.can_manage_clinical()
  and (department_id is null or public.can_access_clinical_department(department_id))
);

drop policy if exists infections_select_scoped on public.infections;
create policy infections_select_scoped on public.infections for select to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (department_id is null or public.can_access_clinical_department(department_id))
);

drop policy if exists infections_write_scoped on public.infections;
create policy infections_write_scoped on public.infections for all to authenticated
using (
  organization_id=(select public.current_organization_id())
  and public.can_manage_clinical()
  and (department_id is null or public.can_access_clinical_department(department_id))
)
with check (
  organization_id=(select public.current_organization_id())
  and public.can_manage_clinical()
  and (department_id is null or public.can_access_clinical_department(department_id))
);

grant select,insert,update,delete on
  public.patients,
  public.surveillance_cases,
  public.patient_samples,
  public.infections
to authenticated;

commit;

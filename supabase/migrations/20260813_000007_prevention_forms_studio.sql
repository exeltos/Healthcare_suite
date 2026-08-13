-- Prevention, dynamic forms and Studio/master-data production persistence.
begin;

create table if not exists public.prevention_records (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  record_type text not null,
  department_id uuid references public.departments(id) on delete set null,
  employee_id text,
  patient_id text,
  record_date date,
  status text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prevention_records_org_type_date_idx on public.prevention_records(organization_id,record_type,record_date);
create index if not exists prevention_records_org_department_idx on public.prevention_records(organization_id,department_id);

create table if not exists public.form_templates (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  form_type text not null default 'checklist',
  category text not null default '',
  status text not null default 'active',
  description text not null default '',
  applies_to jsonb not null default '[]'::jsonb,
  scoring jsonb not null default '{}'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.form_responses (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  template_id text,
  subject_type text not null default '',
  subject_id text not null default '',
  response_date date,
  status text not null default '',
  answers jsonb not null default '{}'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists form_responses_org_template_idx on public.form_responses(organization_id,template_id);

create table if not exists public.studio_configuration (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null,
  rows jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key(organization_id,module_key)
);

create table if not exists public.master_data_libraries (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  library_key text not null,
  rows jsonb not null default '[]'::jsonb,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key(organization_id,library_key)
);

drop trigger if exists prevention_records_set_updated_at on public.prevention_records;
create trigger prevention_records_set_updated_at before update on public.prevention_records for each row execute function public.set_updated_at();
drop trigger if exists form_templates_set_updated_at on public.form_templates;
create trigger form_templates_set_updated_at before update on public.form_templates for each row execute function public.set_updated_at();
drop trigger if exists form_responses_set_updated_at on public.form_responses;
create trigger form_responses_set_updated_at before update on public.form_responses for each row execute function public.set_updated_at();

alter table public.prevention_records enable row level security;
alter table public.form_templates enable row level security;
alter table public.form_responses enable row level security;
alter table public.studio_configuration enable row level security;
alter table public.master_data_libraries enable row level security;

drop policy if exists prevention_records_org on public.prevention_records;
create policy prevention_records_org on public.prevention_records for all to authenticated
using (organization_id=(select public.current_organization_id()) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=(select public.current_organization_id()) and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists form_templates_org on public.form_templates;
create policy form_templates_org on public.form_templates for all to authenticated
using (organization_id=(select public.current_organization_id()))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_quality());

drop policy if exists form_responses_org on public.form_responses;
create policy form_responses_org on public.form_responses for all to authenticated
using (organization_id=(select public.current_organization_id()))
with check (organization_id=(select public.current_organization_id()));

drop policy if exists studio_configuration_org on public.studio_configuration;
create policy studio_configuration_org on public.studio_configuration for all to authenticated
using (organization_id=(select public.current_organization_id()))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_operational());

drop policy if exists master_data_libraries_org on public.master_data_libraries;
create policy master_data_libraries_org on public.master_data_libraries for all to authenticated
using (organization_id=(select public.current_organization_id()))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_operational());

grant select,insert,update,delete on public.prevention_records,public.form_templates,public.form_responses,public.studio_configuration,public.master_data_libraries to authenticated;
commit;

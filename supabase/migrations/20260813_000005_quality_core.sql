-- Quality core: incidents / near misses, CAPA and audit executions.
begin;

create table if not exists public.quality_incidents (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  incident_date date,
  incident_time time,
  title text not null,
  category text not null default '',
  outcome text not null default '',
  status text not null default 'Νέα αναφορά',
  owner text not null default '',
  description text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quality_incidents_org_status_idx on public.quality_incidents(organization_id,status);
create index if not exists quality_incidents_org_department_idx on public.quality_incidents(organization_id,department_id);

create table if not exists public.quality_capa (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  source_id text not null default '',
  source_type text not null default '',
  parent_id text not null default '',
  title text not null,
  action_type text not null default 'Διορθωτική',
  owner text not null default '',
  due_date date,
  priority text not null default 'Μέτρια',
  progress numeric not null default 0 check(progress>=0 and progress<=100),
  status text not null default 'Ανοικτή',
  description text not null default '',
  root_cause text not null default '',
  planned_action text not null default '',
  evidence text not null default '',
  effectiveness_status text not null default 'Εκκρεμεί',
  effectiveness_date date,
  effectiveness_notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quality_capa_org_status_idx on public.quality_capa(organization_id,status);
create index if not exists quality_capa_org_source_idx on public.quality_capa(organization_id,source_id);

create table if not exists public.quality_audits (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  template_id text,
  template_name text not null default '',
  audit_date date,
  status text not null default 'Πρόχειρο',
  compliance numeric,
  scope text not null default '',
  owner text not null default '',
  source_id text not null default '',
  findings jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quality_audits_org_date_idx on public.quality_audits(organization_id,audit_date);
create index if not exists quality_audits_org_department_idx on public.quality_audits(organization_id,department_id);

drop trigger if exists quality_incidents_set_updated_at on public.quality_incidents;
create trigger quality_incidents_set_updated_at before update on public.quality_incidents for each row execute function public.set_updated_at();
drop trigger if exists quality_capa_set_updated_at on public.quality_capa;
create trigger quality_capa_set_updated_at before update on public.quality_capa for each row execute function public.set_updated_at();
drop trigger if exists quality_audits_set_updated_at on public.quality_audits;
create trigger quality_audits_set_updated_at before update on public.quality_audits for each row execute function public.set_updated_at();

create or replace function public.can_manage_quality()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
   select 1 from public.user_profiles p
   where p.user_id=(select auth.uid()) and p.status='active'
   and p.role in ('admin','infection_lead','medical_reviewer','quality_manager','department_user')
 )
$$;
grant execute on function public.can_manage_quality() to authenticated;

alter table public.quality_incidents enable row level security;
alter table public.quality_capa enable row level security;
alter table public.quality_audits enable row level security;

drop policy if exists quality_incidents_scoped on public.quality_incidents;
create policy quality_incidents_scoped on public.quality_incidents for all to authenticated
using (organization_id=(select public.current_organization_id()) and public.can_manage_quality() and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_quality() and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists quality_capa_scoped on public.quality_capa;
create policy quality_capa_scoped on public.quality_capa for all to authenticated
using (organization_id=(select public.current_organization_id()) and public.can_manage_quality() and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_quality() and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists quality_audits_scoped on public.quality_audits;
create policy quality_audits_scoped on public.quality_audits for all to authenticated
using (organization_id=(select public.current_organization_id()) and public.can_manage_quality() and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_quality() and (department_id is null or public.can_access_clinical_department(department_id)));

grant select,insert,update,delete on public.quality_incidents,public.quality_capa,public.quality_audits to authenticated;
commit;

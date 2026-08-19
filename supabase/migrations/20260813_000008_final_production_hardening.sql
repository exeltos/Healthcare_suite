-- Final production write-path hardening: surveillance controls, role configuration and private operational attachments.
begin;

create table if not exists public.surveillance_control_programs (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  title text not null,
  category text not null default '',
  control_type text not null default '',
  next_due_date date,
  active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists surveillance_control_programs_org_due_idx on public.surveillance_control_programs(organization_id,next_due_date);

create table if not exists public.surveillance_control_executions (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id text references public.surveillance_control_programs(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  performed_date date,
  category text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists surveillance_control_executions_org_date_idx on public.surveillance_control_executions(organization_id,performed_date);

create table if not exists public.role_permission_configuration (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_key text not null,
  permissions jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key(organization_id,module_key)
);

drop trigger if exists surveillance_control_programs_set_updated_at on public.surveillance_control_programs;
create trigger surveillance_control_programs_set_updated_at before update on public.surveillance_control_programs for each row execute function public.set_updated_at();
drop trigger if exists surveillance_control_executions_set_updated_at on public.surveillance_control_executions;
create trigger surveillance_control_executions_set_updated_at before update on public.surveillance_control_executions for each row execute function public.set_updated_at();

alter table public.surveillance_control_programs enable row level security;
alter table public.surveillance_control_executions enable row level security;
alter table public.role_permission_configuration enable row level security;

drop policy if exists surveillance_control_programs_scoped on public.surveillance_control_programs;
create policy surveillance_control_programs_scoped on public.surveillance_control_programs for all to authenticated
using (organization_id=(select public.current_organization_id()) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_clinical() and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists surveillance_control_executions_scoped on public.surveillance_control_executions;
create policy surveillance_control_executions_scoped on public.surveillance_control_executions for all to authenticated
using (organization_id=(select public.current_organization_id()) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_clinical() and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists role_permission_configuration_org on public.role_permission_configuration;
create policy role_permission_configuration_org on public.role_permission_configuration for all to authenticated
using (organization_id=(select public.current_organization_id()) and public.is_app_admin())
with check (organization_id=(select public.current_organization_id()) and public.is_app_admin());

grant select,insert,update,delete on public.surveillance_control_programs,public.surveillance_control_executions,public.role_permission_configuration to authenticated;

-- Private bucket shared by non-patient operational files. Object path must start with organization id.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('operationalattachments','operationalattachments',false,26214400,array['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists operationalattachments_select on storage.objects;
create policy operationalattachments_select on storage.objects for select to authenticated
using (bucket_id='operationalattachments' and (storage.foldername(name))[1]=(select public.current_organization_id())::text);
drop policy if exists operationalattachments_insert on storage.objects;
create policy operationalattachments_insert on storage.objects for insert to authenticated
with check (bucket_id='operationalattachments' and (storage.foldername(name))[1]=(select public.current_organization_id())::text);
drop policy if exists operationalattachments_delete on storage.objects;
create policy operationalattachments_delete on storage.objects for delete to authenticated
using (bucket_id='operationalattachments' and (storage.foldername(name))[1]=(select public.current_organization_id())::text);

commit;

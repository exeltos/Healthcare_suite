-- Healthcare Suite / Limoxis
-- Core identity, organization, staff, access scope and private attachment foundation.
-- Apply in a new Supabase project before enabling Production mode.

begin;

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create unique index if not exists departments_org_code_uidx
  on public.departments(organization_id, lower(code))
  where code is not null and btrim(code) <> '';

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_code text,
  first_name text not null default '',
  last_name text not null default '',
  father_name text not null default '',
  professional_category text not null default '',
  gender text not null default '',
  department_id uuid references public.departments(id) on delete set null,
  email text,
  phone text,
  hire_date date,
  notes text not null default '',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists employees_org_code_uidx
  on public.employees(organization_id, lower(employee_code))
  where employee_code is not null and btrim(employee_code) <> '';
create index if not exists employees_org_department_idx
  on public.employees(organization_id, department_id);

create table if not exists public.employee_occupational_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  visit_date date not null,
  fitness text not null default '',
  next_review_date date,
  notes text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists employee_occ_org_employee_idx
  on public.employee_occupational_visits(organization_id, employee_id, visit_date desc);

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid unique references public.employees(id) on delete restrict,
  username text not null,
  email text not null default '',
  display_name text not null default '',
  role text not null default 'department_user'
    check (role in ('admin','infection_lead','infection_liaison','medical_reviewer','department_user','laboratory','demo')),
  status text not null default 'active'
    check (status in ('pending','invited','active','disabled')),
  scope_mode text not null default 'own'
    check (scope_mode in ('own','selected','all')),
  capabilities text[] not null default '{}',
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, username)
);
create index if not exists user_profiles_org_idx on public.user_profiles(organization_id);
create index if not exists user_profiles_employee_idx on public.user_profiles(employee_id);

create table if not exists public.user_department_access (
  user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  can_view boolean not null default true,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, department_id)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  bucket text not null default 'healthcare-attachments',
  object_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists attachments_entity_idx
  on public.attachments(organization_id, entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at=now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at before update on public.departments
for each row execute function public.set_updated_at();

drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at before update on public.employees
for each row execute function public.set_updated_at();

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at before update on public.user_profiles
for each row execute function public.set_updated_at();

drop trigger if exists employee_occ_set_updated_at on public.employee_occupational_visits;
create trigger employee_occ_set_updated_at before update on public.employee_occupational_visits
for each row execute function public.set_updated_at();

-- Security-definer helpers avoid recursive RLS lookups on user_profiles.
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.user_profiles
  where user_id=(select auth.uid())
    and status='active'
  limit 1
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.user_profiles
  where user_id=(select auth.uid())
    and status='active'
  limit 1
$$;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role()='admin',false)
$$;

create or replace function public.has_capability(required_capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_profiles
    where user_id=(select auth.uid())
      and status='active'
      and required_capability=any(capabilities)
  )
$$;

create or replace function public.has_department_access(target_department uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_profiles p
    left join public.employees e on e.id=p.employee_id
    where p.user_id=(select auth.uid())
      and p.status='active'
      and (
        p.role='admin'
        or p.scope_mode='all'
        or (p.scope_mode='own' and e.department_id=target_department)
        or (
          p.scope_mode='selected'
          and exists(
            select 1 from public.user_department_access uda
            where uda.user_id=p.user_id
              and uda.department_id=target_department
              and uda.can_view
          )
        )
      )
  )
$$;

create or replace function public.can_view_staff_directory()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_profiles
    where user_id=(select auth.uid())
      and status='active'
      and (
        role in ('admin','infection_lead')
        or capabilities && array['training','committees','hand_hygiene_observer']::text[]
      )
  )
$$;

create or replace function public.can_manage_occupational_health()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_profiles
    where user_id=(select auth.uid())
      and status='active'
      and role in ('admin','infection_lead','medical_reviewer')
  )
$$;

-- First successful Auth sign-in activates an invited/pending application profile.
create or replace function public.activate_my_profile()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set status='active', last_login=now(), updated_at=now()
  where user_id=(select auth.uid())
    and status in ('pending','invited','active');
  return found;
end;
$$;

-- Current authenticated context consumed by the React auth adapter.
create or replace function public.get_my_context()
returns table (
  user_id uuid,
  organization_id uuid,
  employee_id uuid,
  username text,
  email text,
  display_name text,
  role text,
  status text,
  scope_mode text,
  capabilities text[],
  department_name text,
  professional_category text,
  scope_departments text[],
  last_login timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.user_id,
    p.organization_id,
    p.employee_id,
    p.username,
    coalesce(nullif(p.email,''),au.email::text) as email,
    p.display_name,
    p.role,
    p.status,
    p.scope_mode,
    p.capabilities,
    d.name as department_name,
    e.professional_category,
    case
      when p.scope_mode='all' then (
        select coalesce(array_agg(dep.name order by dep.name),'{}'::text[])
        from public.departments dep
        where dep.organization_id=p.organization_id and dep.active
      )
      when p.scope_mode='selected' then (
        select coalesce(array_agg(dep.name order by dep.name),'{}'::text[])
        from public.user_department_access uda
        join public.departments dep on dep.id=uda.department_id
        where uda.user_id=p.user_id and uda.can_view
      )
      else case when d.name is null then '{}'::text[] else array[d.name] end
    end as scope_departments,
    p.last_login
  from public.user_profiles p
  join auth.users au on au.id=p.user_id
  left join public.employees e on e.id=p.employee_id
  left join public.departments d on d.id=e.department_id
  where p.user_id=(select auth.uid())
    and p.status='active'
  limit 1
$$;

-- Bootstrap only from the SQL editor / trusted service context.
create or replace function public.bootstrap_first_admin(
  target_user_id uuid,
  organization_name text,
  organization_slug text,
  admin_display_name text,
  admin_username text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  org_id uuid;
begin
  if exists(select 1 from public.user_profiles) then
    raise exception 'Healthcare Suite has already been bootstrapped';
  end if;
  if not exists(select 1 from auth.users where id=target_user_id) then
    raise exception 'Target auth user does not exist';
  end if;

  insert into public.organizations(name,slug)
  values(organization_name,organization_slug)
  returning id into org_id;

  insert into public.user_profiles(
    user_id,organization_id,username,email,display_name,role,status,scope_mode
  )
  select
    target_user_id,org_id,admin_username,coalesce(email::text,''),admin_display_name,'admin','active','all'
  from auth.users
  where id=target_user_id;

  return org_id;
end;
$$;

revoke all on function public.bootstrap_first_admin(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(uuid,text,text,text,text) to service_role;

grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.has_capability(text) to authenticated;
grant execute on function public.has_department_access(uuid) to authenticated;
grant execute on function public.can_view_staff_directory() to authenticated;
grant execute on function public.can_manage_occupational_health() to authenticated;
grant execute on function public.get_my_context() to authenticated;
grant execute on function public.activate_my_profile() to authenticated;

alter table public.organizations enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.employee_occupational_visits enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_department_access enable row level security;
alter table public.attachments enable row level security;

-- Organizations
drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own on public.organizations
for select to authenticated
using (id=(select public.current_organization_id()));

drop policy if exists organizations_admin_update on public.organizations;
create policy organizations_admin_update on public.organizations
for update to authenticated
using (id=(select public.current_organization_id()) and (select public.is_app_admin()))
with check (id=(select public.current_organization_id()) and (select public.is_app_admin()));

-- Departments
drop policy if exists departments_select_own_org on public.departments;
create policy departments_select_own_org on public.departments
for select to authenticated
using (organization_id=(select public.current_organization_id()));

drop policy if exists departments_admin_insert on public.departments;
create policy departments_admin_insert on public.departments
for insert to authenticated
with check (organization_id=(select public.current_organization_id()) and (select public.is_app_admin()));

drop policy if exists departments_admin_update on public.departments;
create policy departments_admin_update on public.departments
for update to authenticated
using (organization_id=(select public.current_organization_id()) and (select public.is_app_admin()))
with check (organization_id=(select public.current_organization_id()) and (select public.is_app_admin()));

drop policy if exists departments_admin_delete on public.departments;
create policy departments_admin_delete on public.departments
for delete to authenticated
using (organization_id=(select public.current_organization_id()) and (select public.is_app_admin()));

-- Employees: self record, administrators/infection leads, or scoped staff-directory users.
drop policy if exists employees_select_scoped on public.employees;
create policy employees_select_scoped on public.employees
for select to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (
    id=(select employee_id from public.user_profiles where user_id=(select auth.uid()))
    or (select public.is_app_admin())
    or (select public.current_app_role())='infection_lead'
    or ((select public.can_view_staff_directory()) and (select public.has_department_access(department_id)))
  )
);

drop policy if exists employees_admin_write on public.employees;
create policy employees_admin_write on public.employees
for all to authenticated
using (
  organization_id=(select public.current_organization_id())
  and ((select public.is_app_admin()) or (select public.current_app_role())='infection_lead')
)
with check (
  organization_id=(select public.current_organization_id())
  and ((select public.is_app_admin()) or (select public.current_app_role())='infection_lead')
);

drop policy if exists employee_occ_select_authorized on public.employee_occupational_visits;
create policy employee_occ_select_authorized on public.employee_occupational_visits
for select to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (select public.can_manage_occupational_health())
);

drop policy if exists employee_occ_write_authorized on public.employee_occupational_visits;
create policy employee_occ_write_authorized on public.employee_occupational_visits
for all to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (select public.can_manage_occupational_health())
)
with check (
  organization_id=(select public.current_organization_id())
  and (select public.can_manage_occupational_health())
);

-- User profiles: users can read only themselves; administrators can manage their organization.
drop policy if exists user_profiles_select_self_or_admin on public.user_profiles;
create policy user_profiles_select_self_or_admin on public.user_profiles
for select to authenticated
using (
  user_id=(select auth.uid())
  or (organization_id=(select public.current_organization_id()) and (select public.is_app_admin()))
);

drop policy if exists user_profiles_admin_insert on public.user_profiles;
create policy user_profiles_admin_insert on public.user_profiles
for insert to authenticated
with check (organization_id=(select public.current_organization_id()) and (select public.is_app_admin()));

drop policy if exists user_profiles_admin_update on public.user_profiles;
create policy user_profiles_admin_update on public.user_profiles
for update to authenticated
using (organization_id=(select public.current_organization_id()) and (select public.is_app_admin()))
with check (organization_id=(select public.current_organization_id()) and (select public.is_app_admin()));

drop policy if exists user_profiles_admin_delete on public.user_profiles;
create policy user_profiles_admin_delete on public.user_profiles
for delete to authenticated
using (organization_id=(select public.current_organization_id()) and (select public.is_app_admin()));

-- Department access rows: self may inspect, admin manages.
drop policy if exists user_department_access_select_self_or_admin on public.user_department_access;
create policy user_department_access_select_self_or_admin on public.user_department_access
for select to authenticated
using (
  user_id=(select auth.uid())
  or (select public.is_app_admin())
);

drop policy if exists user_department_access_admin_write on public.user_department_access;
create policy user_department_access_admin_write on public.user_department_access
for all to authenticated
using ((select public.is_app_admin()))
with check ((select public.is_app_admin()));

-- Attachment metadata starts conservatively: uploader or administrator only.
-- Module-specific shared access will be added as each repository is migrated.
drop policy if exists attachments_select_owner_or_admin on public.attachments;
create policy attachments_select_owner_or_admin on public.attachments
for select to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (uploaded_by=(select auth.uid()) or (select public.is_app_admin()))
);

drop policy if exists attachments_insert_own_org on public.attachments;
create policy attachments_insert_own_org on public.attachments
for insert to authenticated
with check (
  organization_id=(select public.current_organization_id())
  and uploaded_by=(select auth.uid())
);

drop policy if exists attachments_delete_owner_or_admin on public.attachments;
create policy attachments_delete_owner_or_admin on public.attachments
for delete to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (uploaded_by=(select auth.uid()) or (select public.is_app_admin()))
);

grant select on public.organizations, public.departments, public.employees, public.employee_occupational_visits, public.user_profiles, public.user_department_access, public.attachments to authenticated;
grant insert, update, delete on public.organizations, public.departments, public.employees, public.employee_occupational_visits, public.user_profiles, public.user_department_access, public.attachments to authenticated;

-- Private Storage bucket. Files use:
-- organization_id / auth_user_id / entity_type / entity_id / filename
insert into storage.buckets(id,name,public)
values('healthcare-attachments','healthcare-attachments',false)
on conflict(id) do update set public=false;

drop policy if exists healthcare_attachments_insert_own_path on storage.objects;
create policy healthcare_attachments_insert_own_path on storage.objects
for insert to authenticated
with check (
  bucket_id='healthcare-attachments'
  and (storage.foldername(name))[1]=(select public.current_organization_id())::text
  and (storage.foldername(name))[2]=(select auth.uid())::text
);

drop policy if exists healthcare_attachments_select_owner_or_admin on storage.objects;
create policy healthcare_attachments_select_owner_or_admin on storage.objects
for select to authenticated
using (
  bucket_id='healthcare-attachments'
  and (storage.foldername(name))[1]=(select public.current_organization_id())::text
  and (
    (storage.foldername(name))[2]=(select auth.uid())::text
    or (select public.is_app_admin())
  )
);

drop policy if exists healthcare_attachments_delete_owner_or_admin on storage.objects;
create policy healthcare_attachments_delete_owner_or_admin on storage.objects
for delete to authenticated
using (
  bucket_id='healthcare-attachments'
  and (storage.foldername(name))[1]=(select public.current_organization_id())::text
  and (
    (storage.foldername(name))[2]=(select auth.uid())::text
    or (select public.is_app_admin())
  )
);

commit;

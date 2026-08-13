-- Upgrade path from v0.9.8 backend foundation to v0.9.9 directory integration.

begin;

alter table public.employees add column if not exists gender text not null default '';
alter table public.employees add column if not exists notes text not null default '';
alter table public.user_profiles add column if not exists email text not null default '';

alter table public.user_profiles drop constraint if exists user_profiles_employee_id_fkey;
alter table public.user_profiles
  add constraint user_profiles_employee_id_fkey
  foreign key (employee_id) references public.employees(id) on delete restrict;

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

drop trigger if exists employee_occ_set_updated_at on public.employee_occupational_visits;
create trigger employee_occ_set_updated_at before update on public.employee_occupational_visits
for each row execute function public.set_updated_at();

create or replace function public.can_manage_occupational_health()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.user_profiles
    where user_id=(select auth.uid())
      and status='active'
      and role in ('admin','infection_lead','medical_reviewer')
  )
$$;
grant execute on function public.can_manage_occupational_health() to authenticated;

alter table public.employee_occupational_visits enable row level security;

drop policy if exists employee_occ_select_authorized on public.employee_occupational_visits;
create policy employee_occ_select_authorized on public.employee_occupational_visits
for select to authenticated
using (organization_id=(select public.current_organization_id()) and (select public.can_manage_occupational_health()));

drop policy if exists employee_occ_write_authorized on public.employee_occupational_visits;
create policy employee_occ_write_authorized on public.employee_occupational_visits
for all to authenticated
using (organization_id=(select public.current_organization_id()) and (select public.can_manage_occupational_health()))
with check (organization_id=(select public.current_organization_id()) and (select public.can_manage_occupational_health()));

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

grant select, insert, update, delete on public.employee_occupational_visits to authenticated;

update public.user_profiles p
set email=coalesce(au.email::text,'')
from auth.users au
where au.id=p.user_id and coalesce(p.email,'')='';

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
    end,
    p.last_login
  from public.user_profiles p
  join auth.users au on au.id=p.user_id
  left join public.employees e on e.id=p.employee_id
  left join public.departments d on d.id=e.department_id
  where p.user_id=(select auth.uid())
    and p.status='active'
  limit 1
$$;

grant execute on function public.get_my_context() to authenticated;

commit;

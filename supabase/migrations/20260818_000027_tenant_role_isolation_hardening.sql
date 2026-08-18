-- P0 tenant / privileged-account isolation hardening.
-- Service-role functions intentionally bypass RLS, so invariants that protect
-- organization membership also live in the database itself.
begin;

create or replace function public.validate_user_profile_tenant_integrity()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  employee_org uuid;
begin
  if tg_op='UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'User profile identity is immutable.';
    end if;
    if new.organization_id is distinct from old.organization_id then
      raise exception 'User profile organization is immutable.';
    end if;
  end if;

  if new.employee_id is not null then
    select organization_id into employee_org
    from public.employees
    where id=new.employee_id;

    if employee_org is null or employee_org<>new.organization_id then
      raise exception 'Linked employee must belong to the user organization.';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists user_profiles_tenant_integrity_guard on public.user_profiles;
create trigger user_profiles_tenant_integrity_guard
before insert or update of user_id,organization_id,employee_id
on public.user_profiles
for each row execute function public.validate_user_profile_tenant_integrity();

-- Frontend account administration is performed only through the authenticated
-- admin-user-account Edge Function. Direct browser writes to privileged identity
-- tables are intentionally unavailable even to application administrators.
revoke insert,update,delete on public.user_profiles from authenticated;
revoke insert,update,delete on public.user_department_access from authenticated;

-- Keep read policies, but make department-scope management policy tenant-explicit
-- for defence in depth when executed by trusted/service contexts in the future.
drop policy if exists user_department_access_admin_write on public.user_department_access;
create policy user_department_access_admin_write on public.user_department_access
for all to authenticated
using (
  public.is_app_admin()
  and exists(
    select 1 from public.user_profiles target
    where target.user_id=user_department_access.user_id
      and target.organization_id=public.current_organization_id()
  )
  and exists(
    select 1 from public.departments dep
    where dep.id=user_department_access.department_id
      and dep.organization_id=public.current_organization_id()
  )
)
with check (
  public.is_app_admin()
  and exists(
    select 1 from public.user_profiles target
    where target.user_id=user_department_access.user_id
      and target.organization_id=public.current_organization_id()
  )
  and exists(
    select 1 from public.departments dep
    where dep.id=user_department_access.department_id
      and dep.organization_id=public.current_organization_id()
  )
);

-- Security-definer helper functions should never inherit EXECUTE from PUBLIC.
revoke all on function public.current_organization_id() from public,anon;
revoke all on function public.current_app_role() from public,anon;
revoke all on function public.is_app_admin() from public,anon;
revoke all on function public.has_capability(text) from public,anon;
revoke all on function public.has_department_access(uuid) from public,anon;
revoke all on function public.can_view_staff_directory() from public,anon;
revoke all on function public.can_manage_occupational_health() from public,anon;
revoke all on function public.get_my_context() from public,anon;
revoke all on function public.activate_my_profile() from public,anon;
revoke all on function public.module_access_level(text) from public,anon;
revoke all on function public.has_module_access(text,boolean) from public,anon;
revoke all on function public.get_my_module_access() from public,anon;
revoke all on function public.has_module_action(text,text) from public,anon;

-- Explicit authenticated grants for application-safe helpers.
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.has_capability(text) to authenticated;
grant execute on function public.has_department_access(uuid) to authenticated;
grant execute on function public.can_view_staff_directory() to authenticated;
grant execute on function public.can_manage_occupational_health() to authenticated;
grant execute on function public.get_my_context() to authenticated;
grant execute on function public.activate_my_profile() to authenticated;
grant execute on function public.module_access_level(text) to authenticated;
grant execute on function public.has_module_access(text,boolean) to authenticated;
grant execute on function public.get_my_module_access() to authenticated;
grant execute on function public.has_module_action(text,text) to authenticated;

commit;

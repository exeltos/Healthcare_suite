-- Management Center integrity and tenant isolation hardening.
begin;

-- Explicitly constrain access scope values and role ids stored in profiles.
alter table public.user_profiles drop constraint if exists user_profiles_scope_mode_check;
alter table public.user_profiles add constraint user_profiles_scope_mode_check
  check (scope_mode in ('own','selected','all'));

alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles add constraint user_profiles_role_check
  check (role in ('admin','infection_lead','infection_liaison','medical_reviewer','department_user','laboratory','demo'));

create or replace function public.validate_user_department_access()
returns trigger language plpgsql set search_path=public as $$
declare user_org uuid; dep_org uuid;
begin
  select organization_id into user_org from public.user_profiles where user_id=new.user_id;
  select organization_id into dep_org from public.departments where id=new.department_id;
  if user_org is null or dep_org is null or user_org<>dep_org then
    raise exception 'User department access must remain inside the user organization.';
  end if;
  return new;
end $$;

drop trigger if exists user_department_access_org_guard on public.user_department_access;
create trigger user_department_access_org_guard
before insert or update of user_id,department_id on public.user_department_access
for each row execute function public.validate_user_department_access();

create or replace function public.validate_configuration_json_rows()
returns trigger language plpgsql set search_path=public as $$
declare total_count int; distinct_count int;
begin
  if jsonb_typeof(new.rows)<>'array' then raise exception 'Configuration rows must be a JSON array.'; end if;
  select count(*),count(distinct x->>'id') into total_count,distinct_count
  from jsonb_array_elements(new.rows) x where nullif(x->>'id','') is not null;
  if total_count<>distinct_count then raise exception 'Configuration contains duplicate row identifiers.'; end if;
  return new;
end $$;

drop trigger if exists studio_configuration_rows_guard on public.studio_configuration;
create trigger studio_configuration_rows_guard before insert or update of rows
on public.studio_configuration for each row execute function public.validate_configuration_json_rows();

drop trigger if exists master_data_libraries_rows_guard on public.master_data_libraries;
create trigger master_data_libraries_rows_guard before insert or update of rows
on public.master_data_libraries for each row execute function public.validate_configuration_json_rows();

commit;

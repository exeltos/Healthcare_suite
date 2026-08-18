-- Platform owner / hospital onboarding foundation.
begin;

create table if not exists public.platform_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default 'Platform Owner',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_owners enable row level security;
revoke all on public.platform_owners from anon,authenticated;

create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.platform_owners
    where user_id=(select auth.uid()) and active=true
  )
$$;

create or replace function public.get_platform_owner_context()
returns table(user_id uuid,email text,display_name text)
language sql
stable
security definer
set search_path=public
as $$
  select p.user_id,p.email,p.display_name
  from public.platform_owners p
  where p.user_id=(select auth.uid()) and p.active=true
  limit 1
$$;

revoke all on function public.is_platform_owner() from public,anon;
revoke all on function public.get_platform_owner_context() from public,anon;
grant execute on function public.is_platform_owner() to authenticated;
grant execute on function public.get_platform_owner_context() to authenticated;

-- Disabled hospitals cannot establish an application organization context.
create or replace function public.current_organization_id()
returns uuid
language sql stable security definer set search_path=public
as $$
  select p.organization_id from public.user_profiles p
  join public.organizations o on o.id=p.organization_id and o.active=true
  where p.user_id=(select auth.uid()) and p.status='active' limit 1
$$;

create or replace function public.activate_my_profile()
returns boolean
language plpgsql security definer set search_path=public
as $$
begin
  update public.user_profiles p set status='active',last_login=now(),updated_at=now()
  where p.user_id=(select auth.uid()) and p.status in ('pending','invited','active')
    and exists(select 1 from public.organizations o where o.id=p.organization_id and o.active=true);
  return found;
end;
$$;

commit;

-- BOOTSTRAP (run once after creating your own Supabase Auth user):
-- insert into public.platform_owners(user_id,email,display_name)
-- select id,email,'Platform Owner' from auth.users where lower(email)=lower('YOUR_EMAIL_HERE');

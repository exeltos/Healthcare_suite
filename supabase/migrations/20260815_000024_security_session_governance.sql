-- ISO/JCI hardening: security/account session governance evidence.
-- Passwords, MFA secrets and provider tokens remain exclusively in Supabase Auth.
begin;

create table if not exists public.security_auth_events(
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb,
  constraint security_auth_event_type_check check(event_type in (
    'profile_activated','account_disabled','account_enabled','privilege_changed','department_access_changed'
  ))
);

create index if not exists security_auth_events_org_time_idx
  on public.security_auth_events(organization_id,occurred_at desc);

alter table public.security_auth_events enable row level security;
drop policy if exists security_auth_events_read_admin on public.security_auth_events;
create policy security_auth_events_read_admin on public.security_auth_events
for select to authenticated
using (organization_id=public.current_organization_id() and public.is_app_admin());

revoke insert,update,delete,truncate on public.security_auth_events from authenticated,anon;
grant select on public.security_auth_events to authenticated;

-- Privileged configuration/access changes are already captured by system_audit_log.
-- Provider-level password/MFA/login-failure policies intentionally stay in Supabase Auth;
-- the application never stores credentials or MFA factors itself.

commit;

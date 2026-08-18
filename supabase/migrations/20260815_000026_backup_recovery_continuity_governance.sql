-- ISO/JCI hardening: backup, restore testing and business-continuity evidence.
-- This is governance/evidence only. Actual backups remain the responsibility of the managed infrastructure.
begin;

create table if not exists public.continuity_recovery_profiles(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_key text not null default 'primary',
  backup_provider text not null default '',
  backup_scope text not null default '',
  backup_frequency text not null default '',
  rpo_hours integer,
  rto_hours integer,
  responsible_owner text not null default '',
  recovery_runbook_location text not null default '',
  last_backup_verified_at timestamptz,
  last_restore_test_at timestamptz,
  last_restore_test_result text not null default 'not_tested',
  next_restore_test_due date,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint continuity_rpo_check check(rpo_hours is null or rpo_hours between 0 and 8760),
  constraint continuity_rto_check check(rto_hours is null or rto_hours between 0 and 8760),
  constraint restore_test_result_check check(last_restore_test_result in ('not_tested','passed','failed','partial')),
  primary key(organization_id,profile_key)
);

create table if not exists public.continuity_recovery_tests(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tested_at timestamptz not null default now(),
  test_type text not null default 'restore',
  scope text not null default '',
  result text not null,
  actual_rpo_hours numeric,
  actual_rto_hours numeric,
  evidence_reference text not null default '',
  findings text not null default '',
  corrective_action_reference text not null default '',
  tested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint recovery_test_type_check check(test_type in ('restore','failover','downtime_procedure','tabletop')),
  constraint recovery_test_result_check check(result in ('passed','failed','partial')),
  constraint recovery_test_rpo_check check(actual_rpo_hours is null or actual_rpo_hours >= 0),
  constraint recovery_test_rto_check check(actual_rto_hours is null or actual_rto_hours >= 0)
);

create index if not exists recovery_tests_org_time_idx
  on public.continuity_recovery_tests(organization_id,tested_at desc);

alter table public.continuity_recovery_profiles enable row level security;
alter table public.continuity_recovery_tests enable row level security;

drop policy if exists continuity_profile_read_admin on public.continuity_recovery_profiles;
create policy continuity_profile_read_admin on public.continuity_recovery_profiles
for select to authenticated
using(organization_id=public.current_organization_id() and public.is_app_admin());

drop policy if exists continuity_profile_manage_admin on public.continuity_recovery_profiles;
create policy continuity_profile_manage_admin on public.continuity_recovery_profiles
for all to authenticated
using(organization_id=public.current_organization_id() and public.is_app_admin())
with check(organization_id=public.current_organization_id() and public.is_app_admin());

drop policy if exists recovery_tests_read_admin on public.continuity_recovery_tests;
create policy recovery_tests_read_admin on public.continuity_recovery_tests
for select to authenticated
using(organization_id=public.current_organization_id() and public.is_app_admin());

drop policy if exists recovery_tests_manage_admin on public.continuity_recovery_tests;
create policy recovery_tests_manage_admin on public.continuity_recovery_tests
for all to authenticated
using(organization_id=public.current_organization_id() and public.is_app_admin())
with check(organization_id=public.current_organization_id() and public.is_app_admin());

-- Include continuity evidence in the immutable system audit trail.
drop trigger if exists continuity_recovery_profiles_system_audit on public.continuity_recovery_profiles;
create trigger continuity_recovery_profiles_system_audit
after insert or update or delete on public.continuity_recovery_profiles
for each row execute function public.capture_system_audit();

drop trigger if exists continuity_recovery_tests_system_audit on public.continuity_recovery_tests;
create trigger continuity_recovery_tests_system_audit
after insert or update or delete on public.continuity_recovery_tests
for each row execute function public.capture_system_audit();

commit;

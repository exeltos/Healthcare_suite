-- Healthcare Suite rc.81
-- Activate P1 governance visibility: security events, privacy governance,
-- indicator definition history and notification policy recipient metadata.
begin;

-- 1) Privacy / GDPR governance profile (internal evidence, not legal certification).
create table if not exists public.privacy_governance_profiles(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_key text not null default 'primary',
  controller_name text not null default '',
  dpo_owner text not null default '',
  processor_contract_confirmed boolean not null default false,
  hosting_region_confirmed boolean not null default false,
  backup_region_confirmed boolean not null default false,
  breach_process_confirmed boolean not null default false,
  dsar_process_confirmed boolean not null default false,
  retention_policy_confirmed boolean not null default false,
  attachment_access_reviewed boolean not null default false,
  analytics_deidentification_reviewed boolean not null default false,
  last_reviewed_at timestamptz,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  primary key(organization_id,profile_key)
);
alter table public.privacy_governance_profiles enable row level security;
drop policy if exists privacy_governance_read_admin on public.privacy_governance_profiles;
create policy privacy_governance_read_admin on public.privacy_governance_profiles
for select to authenticated
using(organization_id=public.current_organization_id() and public.is_app_admin());
drop policy if exists privacy_governance_manage_admin on public.privacy_governance_profiles;
create policy privacy_governance_manage_admin on public.privacy_governance_profiles
for all to authenticated
using(organization_id=public.current_organization_id() and public.is_app_admin())
with check(organization_id=public.current_organization_id() and public.is_app_admin());

drop trigger if exists privacy_governance_profiles_system_audit on public.privacy_governance_profiles;
create trigger privacy_governance_profiles_system_audit
after insert or update or delete on public.privacy_governance_profiles
for each row execute function public.capture_system_audit();

-- 2) Security events are emitted server-side from account/profile changes.
create or replace function public.capture_user_profile_security_event()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  event_name text;
  event_details jsonb := '{}'::jsonb;
  org uuid;
  uid uuid;
begin
  org := coalesce(new.organization_id,old.organization_id);
  uid := coalesce(new.user_id,old.user_id);

  if tg_op='INSERT' then
    if new.status='active' then
      event_name := 'profile_activated';
      event_details := jsonb_build_object('role',new.role,'status',new.status,'source','user_profiles');
    end if;
  elsif tg_op='UPDATE' then
    if old.status is distinct from new.status then
      if new.status='disabled' then event_name := 'account_disabled';
      elsif old.status='disabled' and new.status='active' then event_name := 'account_enabled';
      elsif new.status='active' and old.status in ('pending','invited') then event_name := 'profile_activated';
      end if;
      if event_name is not null then
        event_details := jsonb_build_object('oldStatus',old.status,'newStatus',new.status,'source','user_profiles');
      end if;
    end if;

    if old.role is distinct from new.role
       or old.scope_mode is distinct from new.scope_mode
       or old.capabilities is distinct from new.capabilities then
      insert into public.security_auth_events(organization_id,user_id,event_type,details)
      values(org,uid,'privilege_changed',
        jsonb_build_object(
          'oldRole',old.role,'newRole',new.role,
          'oldScopeMode',old.scope_mode,'newScopeMode',new.scope_mode,
          'oldCapabilities',old.capabilities,'newCapabilities',new.capabilities,
          'source','user_profiles'
        ));
    end if;
  end if;

  if event_name is not null then
    insert into public.security_auth_events(organization_id,user_id,event_type,details)
    values(org,uid,event_name,event_details);
  end if;
  return coalesce(new,old);
end $$;

drop trigger if exists user_profiles_security_event on public.user_profiles;
create trigger user_profiles_security_event
after insert or update on public.user_profiles
for each row execute function public.capture_user_profile_security_event();

create or replace function public.capture_department_access_security_event()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  uid uuid;
  dep uuid;
  org uuid;
begin
  uid := coalesce(new.user_id,old.user_id);
  dep := coalesce(new.department_id,old.department_id);
  select organization_id into org from public.user_profiles where user_id=uid limit 1;
  if org is null then return coalesce(new,old); end if;

  insert into public.security_auth_events(organization_id,user_id,event_type,details)
  values(
    org,uid,'department_access_changed',
    jsonb_build_object(
      'operation',tg_op,
      'departmentId',dep,
      'old',case when tg_op in ('UPDATE','DELETE') then public.audit_redact(to_jsonb(old)) else null end,
      'new',case when tg_op in ('INSERT','UPDATE') then public.audit_redact(to_jsonb(new)) else null end,
      'source','user_department_access'
    )
  );
  return coalesce(new,old);
end $$;

drop trigger if exists user_department_access_security_event on public.user_department_access;
create trigger user_department_access_security_event
after insert or update or delete on public.user_department_access
for each row execute function public.capture_department_access_security_event();

-- 3) Indicator definition provenance/history.
create table if not exists public.indicator_definition_history(
  history_id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  indicator_id text not null,
  definition_version text not null default '',
  settings jsonb not null default '{}'::jsonb,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null,
  change_type text not null default 'UPDATE'
    check(change_type in ('INSERT','UPDATE','DELETE'))
);
create index if not exists indicator_definition_history_idx
  on public.indicator_definition_history(organization_id,indicator_id,changed_at desc);
alter table public.indicator_definition_history enable row level security;
drop policy if exists indicator_definition_history_read on public.indicator_definition_history;
create policy indicator_definition_history_read on public.indicator_definition_history
for select to authenticated
using(
  organization_id=public.current_organization_id()
  and (public.is_app_admin() or public.can_manage_quality())
);
revoke insert,update,delete,truncate on public.indicator_definition_history from authenticated,anon;
grant select on public.indicator_definition_history to authenticated;

create or replace function public.capture_indicator_definition_history()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  body jsonb;
  org uuid;
  iid text;
begin
  body := coalesce(new.settings,old.settings,'{}'::jsonb);
  org := coalesce(new.organization_id,old.organization_id);
  iid := coalesce(new.indicator_id,old.indicator_id);
  if tg_op='UPDATE' and old.settings is not distinct from new.settings then return new; end if;
  insert into public.indicator_definition_history(
    organization_id,indicator_id,definition_version,settings,changed_by,change_type
  ) values (
    org,iid,coalesce(body->>'governanceVersion',''),body,auth.uid(),tg_op
  );
  return coalesce(new,old);
end $$;

drop trigger if exists indicator_settings_definition_history on public.indicator_settings;
create trigger indicator_settings_definition_history
after insert or update or delete on public.indicator_settings
for each row execute function public.capture_indicator_definition_history();

create or replace function public.capture_custom_indicator_definition_history()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  body jsonb;
  org uuid;
  iid text;
begin
  body := coalesce(new.data,old.data,'{}'::jsonb);
  org := coalesce(new.organization_id,old.organization_id);
  iid := coalesce(new.id,old.id);
  if tg_op='UPDATE' and old.data is not distinct from new.data then return new; end if;
  insert into public.indicator_definition_history(
    organization_id,indicator_id,definition_version,settings,changed_by,change_type
  ) values (org,iid,coalesce(body->>'governanceVersion',''),body,auth.uid(),tg_op);
  return coalesce(new,old);
end $$;

drop trigger if exists custom_indicators_definition_history on public.custom_indicators;
create trigger custom_indicators_definition_history
after insert or update or delete on public.custom_indicators
for each row execute function public.capture_custom_indicator_definition_history();

-- 4) Ensure policy defaults include recipient roles and closed-loop intent.
update public.notification_escalation_policies
set settings = coalesce(settings,'{}'::jsonb) ||
  case policy_key
    when 'critical_lab_result' then '{"closedLoop":true,"recipientRoles":["laboratory","infection_lead","admin"]}'::jsonb
    when 'serious_incident' then '{"closedLoop":true,"recipientRoles":["infection_lead","admin"]}'::jsonb
    when 'overdue_capa' then '{"recipientRoles":["infection_lead","admin"]}'::jsonb
    when 'document_review_overdue' then '{"recipientRoles":["infection_lead","admin"]}'::jsonb
    when 'competency_followup' then '{"recipientRoles":["infection_lead","admin"]}'::jsonb
    else '{}'::jsonb
  end,
  updated_at=now();

commit;

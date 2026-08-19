-- ISO/JCI hardening: centralized notification/escalation governance.
-- The UI derives live alerts from source records; this table holds organization-level policy without duplicating clinical data.
begin;

create table if not exists public.notification_escalation_policies(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_key text not null,
  enabled boolean not null default true,
  severity text not null default 'warning',
  escalation_after_hours integer,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key(organization_id,policy_key),
  constraint notification_policy_severity_check check (severity in ('info','warning','danger')),
  constraint notification_policy_hours_check check (escalation_after_hours is null or escalation_after_hours >= 1)
);

alter table public.notification_escalation_policies enable row level security;

drop policy if exists notification_policies_select_org on public.notification_escalation_policies;
create policy notification_policies_select_org on public.notification_escalation_policies
for select using (organization_id=public.current_organization_id());

drop policy if exists notification_policies_manage_admin on public.notification_escalation_policies;
create policy notification_policies_manage_admin on public.notification_escalation_policies
for all using (organization_id=public.current_organization_id() and public.is_org_admin())
with check (organization_id=public.current_organization_id() and public.is_org_admin());

insert into public.notification_escalation_policies(organization_id,policy_key,severity,escalation_after_hours,settings)
select id,'critical_lab_result','danger',1,'{"closedLoop":true}'::jsonb from public.organizations
on conflict do nothing;
insert into public.notification_escalation_policies(organization_id,policy_key,severity,escalation_after_hours,settings)
select id,'serious_incident','danger',4,'{"outcomes":["Σοβαρή βλάβη","Θάνατος"]}'::jsonb from public.organizations
on conflict do nothing;
insert into public.notification_escalation_policies(organization_id,policy_key,severity,escalation_after_hours,settings)
select id,'overdue_capa','danger',24,'{}'::jsonb from public.organizations
on conflict do nothing;
insert into public.notification_escalation_policies(organization_id,policy_key,severity,escalation_after_hours,settings)
select id,'document_review_overdue','warning',24,'{}'::jsonb from public.organizations
on conflict do nothing;
insert into public.notification_escalation_policies(organization_id,policy_key,severity,escalation_after_hours,settings)
select id,'competency_followup','warning',24,'{}'::jsonb from public.organizations
on conflict do nothing;

commit;

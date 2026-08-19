-- ISO/JCI hardening: data retention & archiving governance.
-- No automatic destructive deletion is performed. Retention expiry creates review eligibility only.
begin;

create table if not exists public.data_retention_policies(
  organization_id uuid not null references public.organizations(id) on delete cascade,
  policy_key text not null,
  record_category text not null,
  retention_years integer not null,
  disposition text not null default 'archive',
  owner text not null default '',
  legal_basis text not null default '',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key(organization_id,policy_key),
  constraint retention_years_check check(retention_years between 1 and 100),
  constraint retention_disposition_check check(disposition in ('archive','review_before_delete'))
);

alter table public.data_retention_policies enable row level security;
drop policy if exists retention_policy_select_org on public.data_retention_policies;
create policy retention_policy_select_org on public.data_retention_policies
for select to authenticated using(organization_id=public.current_organization_id());

drop policy if exists retention_policy_manage_admin on public.data_retention_policies;
create policy retention_policy_manage_admin on public.data_retention_policies
for all to authenticated
using(organization_id=public.current_organization_id() and public.is_app_admin())
with check(organization_id=public.current_organization_id() and public.is_app_admin());

-- The defaults are intentionally conservative placeholders and MUST be confirmed
-- against the organization's legal/DPO policy before production go-live.
insert into public.data_retention_policies(organization_id,policy_key,record_category,retention_years,disposition,owner,legal_basis)
select id,'clinical','Clinical records',20,'archive','DPO / Medical Service','Confirm against applicable law and organization policy.' from public.organizations on conflict do nothing;
insert into public.data_retention_policies(organization_id,policy_key,record_category,retention_years,disposition,owner,legal_basis)
select id,'quality','Quality / CAPA / Audits',10,'archive','Quality Manager','Organization retention policy.' from public.organizations on conflict do nothing;
insert into public.data_retention_policies(organization_id,policy_key,record_category,retention_years,disposition,owner,legal_basis)
select id,'documents','Controlled documents',10,'archive','Quality Manager','Version history and implementation evidence.' from public.organizations on conflict do nothing;
insert into public.data_retention_policies(organization_id,policy_key,record_category,retention_years,disposition,owner,legal_basis)
select id,'training','Training / Competency',10,'archive','Training / HR','Training and competency evidence.' from public.organizations on conflict do nothing;
insert into public.data_retention_policies(organization_id,policy_key,record_category,retention_years,disposition,owner,legal_basis)
select id,'audit','System audit trail',10,'archive','IT / DPO','Security and accountability evidence.' from public.organizations on conflict do nothing;

-- Prevent application-side deletion of evidence-bearing audit records.
revoke delete,truncate on public.system_audit_log from authenticated,anon;

commit;

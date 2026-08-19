-- ISO/JCI hardening phase 2: proactive risk register and controlled incident lifecycle.
begin;

create table if not exists public.quality_risks (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  title text not null,
  category text not null default '',
  description text not null default '',
  likelihood smallint not null default 1 check (likelihood between 1 and 5),
  severity smallint not null default 1 check (severity between 1 and 5),
  risk_score smallint not null default 1 check (risk_score between 1 and 25),
  controls text not null default '',
  actions text not null default '',
  owner text not null default '',
  review_date date,
  status text not null default 'Ανοικτός',
  residual_likelihood smallint not null default 1 check (residual_likelihood between 1 and 5),
  residual_severity smallint not null default 1 check (residual_severity between 1 and 5),
  residual_score smallint not null default 1 check (residual_score between 1 and 25),
  data jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quality_risks_org_score_idx on public.quality_risks(organization_id,risk_score desc);
create index if not exists quality_risks_org_review_idx on public.quality_risks(organization_id,review_date);
create index if not exists quality_risks_org_department_idx on public.quality_risks(organization_id,department_id);

drop trigger if exists quality_risks_set_updated_at on public.quality_risks;
create trigger quality_risks_set_updated_at before update on public.quality_risks for each row execute function public.set_updated_at();

alter table public.quality_risks enable row level security;
drop policy if exists quality_risks_select on public.quality_risks;
create policy quality_risks_select on public.quality_risks for select to authenticated
using (organization_id=(select public.current_organization_id()) and public.can_manage_quality() and (department_id is null or public.can_access_clinical_department(department_id)));
drop policy if exists quality_risks_insert on public.quality_risks;
create policy quality_risks_insert on public.quality_risks for insert to authenticated
with check (organization_id=(select public.current_organization_id()) and public.can_manage_quality() and (department_id is null or public.can_access_clinical_department(department_id)));
drop policy if exists quality_risks_update on public.quality_risks;
create policy quality_risks_update on public.quality_risks for update to authenticated
using (organization_id=(select public.current_organization_id()) and public.can_manage_quality() and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_quality() and (department_id is null or public.can_access_clinical_department(department_id)));

grant select,insert,update on public.quality_risks to authenticated;
revoke delete on public.quality_risks from authenticated;

drop trigger if exists quality_risks_system_audit on public.quality_risks;
create trigger quality_risks_system_audit after insert or update or delete on public.quality_risks for each row execute function public.capture_system_audit();

drop trigger if exists quality_risks_no_hard_delete on public.quality_risks;
create trigger quality_risks_no_hard_delete before delete on public.quality_risks for each row execute function public.guard_quality_evidence_delete();

-- Prevent reopening/cancelling a formally closed incident by a normal update.
create or replace function public.guard_quality_incident_lifecycle()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.status='Κλειστό' and new.status is distinct from old.status then
    raise exception 'Closed incidents are controlled evidence and cannot be reopened. Create a follow-up record instead.';
  end if;
  if old.status='Ακυρωμένο' and new.status is distinct from old.status then
    raise exception 'Cancelled incidents cannot be reactivated.';
  end if;
  return new;
end $$;

drop trigger if exists quality_incidents_lifecycle_guard on public.quality_incidents;
create trigger quality_incidents_lifecycle_guard before update on public.quality_incidents for each row execute function public.guard_quality_incident_lifecycle();

commit;

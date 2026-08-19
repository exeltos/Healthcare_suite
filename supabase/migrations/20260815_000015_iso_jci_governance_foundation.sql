-- ISO/JCI governance foundation: immutable audit trail and non-destructive lifecycle for quality records.
-- Designed to add governance in the backend while keeping daily user workflows simple.
begin;

create table if not exists public.system_audit_log (
  audit_id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id text not null default '',
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  changed_fields text[] not null default '{}'::text[],
  old_values jsonb,
  new_values jsonb,
  reason text not null default ''
);
create index if not exists system_audit_log_org_time_idx on public.system_audit_log(organization_id,occurred_at desc);
create index if not exists system_audit_log_entity_idx on public.system_audit_log(organization_id,entity_type,entity_id,occurred_at desc);

alter table public.system_audit_log enable row level security;
drop policy if exists system_audit_log_read_scoped on public.system_audit_log;
create policy system_audit_log_read_scoped on public.system_audit_log
for select to authenticated
using (
  organization_id=(select public.current_organization_id())
  and (public.is_app_admin() or public.can_manage_quality())
);
revoke insert,update,delete on public.system_audit_log from authenticated;
grant select on public.system_audit_log to authenticated;

create or replace function public.capture_system_audit()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  oldj jsonb;
  newj jsonb;
  org uuid;
  eid text;
  keys text[] := '{}'::text[];
  k text;
  old_changed jsonb := '{}'::jsonb;
  new_changed jsonb := '{}'::jsonb;
  why text := '';
begin
  oldj := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  newj := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  org := nullif(coalesce(newj->>'organization_id',oldj->>'organization_id'),'')::uuid;
  if org is null then return coalesce(new,old); end if;
  eid := coalesce(newj->>'id',oldj->>'id',newj->>'user_id',oldj->>'user_id','');

  if tg_op='UPDATE' then
    for k in select key from jsonb_object_keys(coalesce(oldj,'{}'::jsonb) || coalesce(newj,'{}'::jsonb)) key loop
      if k not in ('updated_at') and (oldj->k is distinct from newj->k) then
        keys := array_append(keys,k);
        old_changed := old_changed || jsonb_build_object(k,oldj->k);
        new_changed := new_changed || jsonb_build_object(k,newj->k);
      end if;
    end loop;
  elsif tg_op='INSERT' then
    keys := array(select jsonb_object_keys(coalesce(newj,'{}'::jsonb)));
    new_changed := newj;
  else
    keys := array(select jsonb_object_keys(coalesce(oldj,'{}'::jsonb)));
    old_changed := oldj;
  end if;

  why := coalesce(newj->>'archive_reason',oldj->>'archive_reason',newj#>>'{data,changeReason}',oldj#>>'{data,changeReason}','');

  insert into public.system_audit_log(
    organization_id,actor_user_id,entity_type,entity_id,action,changed_fields,old_values,new_values,reason
  ) values (
    org,auth.uid(),tg_table_name,eid,tg_op,coalesce(keys,'{}'::text[]),
    case when old_changed='{}'::jsonb then null else old_changed end,
    case when new_changed='{}'::jsonb then null else new_changed end,
    why
  );
  return coalesce(new,old);
end $$;

-- Non-destructive lifecycle for records that may be evidence in a quality/accreditation review.
alter table public.quality_incidents add column if not exists archived_at timestamptz;
alter table public.quality_incidents add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.quality_incidents add column if not exists archive_reason text not null default '';

alter table public.quality_capa add column if not exists archived_at timestamptz;
alter table public.quality_capa add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.quality_capa add column if not exists archive_reason text not null default '';

alter table public.quality_audits add column if not exists archived_at timestamptz;
alter table public.quality_audits add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.quality_audits add column if not exists archive_reason text not null default '';
alter table public.quality_audits add column if not exists finalized_at timestamptz;
alter table public.quality_audits add column if not exists finalized_by uuid references auth.users(id) on delete set null;

create or replace function public.guard_quality_evidence_delete()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'This quality record is controlled evidence and cannot be physically deleted. Archive/cancel it instead.';
end $$;

drop trigger if exists quality_incidents_no_hard_delete on public.quality_incidents;
create trigger quality_incidents_no_hard_delete before delete on public.quality_incidents for each row execute function public.guard_quality_evidence_delete();
drop trigger if exists quality_capa_no_hard_delete on public.quality_capa;
create trigger quality_capa_no_hard_delete before delete on public.quality_capa for each row execute function public.guard_quality_evidence_delete();
drop trigger if exists quality_audits_no_hard_delete on public.quality_audits;
create trigger quality_audits_no_hard_delete before delete on public.quality_audits for each row execute function public.guard_quality_evidence_delete();

-- Once finalized, an audit's evidence is locked. Workflow linkage (for example capaId) may still be appended.
create or replace function public.audit_findings_evidence(value jsonb)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(item - 'capaId' order by ord),'[]'::jsonb)
  from jsonb_array_elements(coalesce(value,'[]'::jsonb)) with ordinality as x(item,ord)
$$;

create or replace function public.guard_finalized_quality_audit()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.finalized_at is not null and (
    new.template_id is distinct from old.template_id or
    new.template_name is distinct from old.template_name or
    new.audit_date is distinct from old.audit_date or
    new.compliance is distinct from old.compliance or
    new.scope is distinct from old.scope or
    new.owner is distinct from old.owner or
    new.source_id is distinct from old.source_id or
    public.audit_findings_evidence(new.findings) is distinct from public.audit_findings_evidence(old.findings) or
    new.answers is distinct from old.answers
  ) then
    raise exception 'Finalized audit evidence is locked. Create an addendum/follow-up instead of editing the original execution.';
  end if;
  return new;
end $$;
drop trigger if exists quality_audits_finalized_guard on public.quality_audits;
create trigger quality_audits_finalized_guard before update on public.quality_audits for each row execute function public.guard_finalized_quality_audit();

-- Attach audit capture to high-value clinical, safety, prevention and governance records.
do $$
declare t text;
begin
  foreach t in array array[
    'patients','surveillance_cases','patient_samples','infections','patient_isolations',
    'quality_incidents','quality_capa','quality_audits','controlled_documents','training_records',
    'committees','prevention_records','notifiable_diseases','form_responses',
    'surveillance_control_programs','surveillance_control_executions','indicator_source_records'
  ] loop
    execute format('drop trigger if exists %I_system_audit on public.%I',t,t);
    execute format('create trigger %I_system_audit after insert or update or delete on public.%I for each row execute function public.capture_system_audit()',t,t);
  end loop;
end $$;

commit;

-- ISO/JCI hardening: immutable audit trail & accountability expansion.
begin;

alter table public.system_audit_log
  add column if not exists request_id uuid not null default gen_random_uuid(),
  add column if not exists actor_role text not null default '',
  add column if not exists source text not null default 'application';

create index if not exists system_audit_log_actor_idx
  on public.system_audit_log(organization_id,actor_user_id,occurred_at desc);

-- Audit evidence is append-only even for privileged application users.
revoke insert,update,delete,truncate on public.system_audit_log from authenticated;
revoke insert,update,delete,truncate on public.system_audit_log from anon;

create or replace function public.audit_redact(j jsonb)
returns jsonb
language sql
immutable
set search_path=public
as $$
  select case when j is null then null else
    j
      - 'password'
      - 'password_hash'
      - 'access_token'
      - 'refresh_token'
      - 'token'
      - 'secret'
      - 'api_key'
  end
$$;

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
  role_name text := '';
begin
  oldj := case when tg_op in ('UPDATE','DELETE') then public.audit_redact(to_jsonb(old)) else null end;
  newj := case when tg_op in ('INSERT','UPDATE') then public.audit_redact(to_jsonb(new)) else null end;
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
    -- Do not create meaningless audit rows for timestamp-only updates.
    if coalesce(array_length(keys,1),0)=0 then return new; end if;
  elsif tg_op='INSERT' then
    keys := array(select jsonb_object_keys(coalesce(newj,'{}'::jsonb)));
    new_changed := newj;
  else
    keys := array(select jsonb_object_keys(coalesce(oldj,'{}'::jsonb)));
    old_changed := oldj;
  end if;

  why := coalesce(newj->>'archive_reason',oldj->>'archive_reason',newj#>>'{data,changeReason}',oldj#>>'{data,changeReason}','');

  select coalesce(up.role,'') into role_name
  from public.user_profiles up
  where up.user_id=auth.uid() and up.organization_id=org
  limit 1;

  insert into public.system_audit_log(
    organization_id,actor_user_id,actor_role,entity_type,entity_id,action,
    changed_fields,old_values,new_values,reason,source
  ) values (
    org,auth.uid(),role_name,tg_table_name,eid,tg_op,
    coalesce(keys,'{}'::text[]),
    case when old_changed='{}'::jsonb then null else old_changed end,
    case when new_changed='{}'::jsonb then null else new_changed end,
    why,'application'
  );
  return coalesce(new,old);
end $$;

-- Expand automatic accountability to the remaining configuration, staff,
-- laboratory and indicator records that materially affect care/quality workflows.
do $$
declare t text;
begin
  foreach t in array array[
    'employees','employee_occupational_visits','laboratory_source_samples',
    'form_templates','indicator_settings','custom_indicators',
    'master_data_libraries','studio_configuration','role_permission_configuration',
    'user_department_access','notification_escalation_policies'
  ] loop
    execute format('drop trigger if exists %I_system_audit on public.%I',t,t);
    execute format('create trigger %I_system_audit after insert or update or delete on public.%I for each row execute function public.capture_system_audit()',t,t);
  end loop;
end $$;

commit;

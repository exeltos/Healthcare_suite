-- Committee and controlled-document integrity.
begin;

create unique index if not exists committees_org_name_unique_ci
  on public.committees(organization_id,lower(btrim(name)));

alter table public.committees drop constraint if exists committees_meeting_dates_check;
alter table public.committees add constraint committees_meeting_dates_check
  check (next_meeting is null or last_meeting is null or next_meeting>=last_meeting);

create or replace function public.validate_committee_payload()
returns trigger language plpgsql set search_path=public as $$
declare member jsonb; meeting jsonb; action jsonb; member_key text; seen text[]:=array[]::text[];
begin
  for member in select * from jsonb_array_elements(coalesce(new.members,'[]'::jsonb)) loop
    member_key:=coalesce(nullif(member->>'employeeId',''),lower(btrim(member->>'fullName')));
    if member_key is not null and member_key=any(seen) then raise exception 'Committee contains duplicate members.'; end if;
    if member_key is not null then seen:=array_append(seen,member_key); end if;
    if nullif(member->>'employeeId','') is not null and not exists(
      select 1 from public.employees e where e.id::text=member->>'employeeId' and e.organization_id=new.organization_id
    ) then raise exception 'Committee registry member must belong to the same organization.'; end if;
  end loop;
  for meeting in select * from jsonb_array_elements(coalesce(new.meetings,'[]'::jsonb)) loop
    for action in select * from jsonb_array_elements(coalesce(meeting->'actions','[]'::jsonb)) loop
      if nullif(action->>'dueDate','') is not null and nullif(meeting->>'date','') is not null
         and (action->>'dueDate')::date < (meeting->>'date')::date
      then raise exception 'Committee action due date cannot precede meeting date.'; end if;
    end loop;
  end loop;
  return new;
end $$;

drop trigger if exists committee_payload_guard on public.committees;
create trigger committee_payload_guard before insert or update of organization_id,members,meetings
on public.committees for each row execute function public.validate_committee_payload();

create or replace function public.validate_controlled_document()
returns trigger language plpgsql set search_path=public as $$
declare versions_count int; distinct_versions int;
begin
  if new.status='Σε ισχύ' and jsonb_array_length(coalesce(new.attachments,'[]'::jsonb))=0
  then raise exception 'In-force controlled document requires an attachment.'; end if;
  select count(*),count(distinct x->>'version') into versions_count,distinct_versions
  from jsonb_array_elements(coalesce(new.versions,'[]'::jsonb)) x where nullif(x->>'version','') is not null;
  if versions_count<>distinct_versions then raise exception 'Controlled document contains duplicate version history.'; end if;
  return new;
end $$;

drop trigger if exists controlled_document_guard on public.controlled_documents;
create trigger controlled_document_guard before insert or update of status,attachments,versions
on public.controlled_documents for each row execute function public.validate_controlled_document();

commit;

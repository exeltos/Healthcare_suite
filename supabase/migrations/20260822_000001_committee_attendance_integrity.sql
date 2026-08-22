begin;

-- Committee attendance is evidence. Every attendance row must point to a
-- member of the same committee/organization as the meeting. This prevents a
-- client or stale payload from recording an arbitrary employee as present.
create or replace function public.guard_committee_meeting_attendee_membership()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_meeting_committee_id text;
  v_meeting_org uuid;
  v_member_committee_id text;
  v_member_org uuid;
  v_member_employee_id uuid;
begin
  select committee_id, organization_id
    into v_meeting_committee_id, v_meeting_org
  from public.committee_meetings
  where id = new.meeting_id;

  if v_meeting_committee_id is null then
    raise exception 'Committee meeting does not exist.';
  end if;

  if new.organization_id is distinct from v_meeting_org then
    raise exception 'Attendance organization must match the committee meeting organization.';
  end if;

  if new.committee_member_id is null then
    raise exception 'Meeting attendance must reference a committee member.';
  end if;

  select committee_id, organization_id, employee_id
    into v_member_committee_id, v_member_org, v_member_employee_id
  from public.committee_members
  where id = new.committee_member_id;

  if v_member_committee_id is null then
    raise exception 'Committee member does not exist.';
  end if;

  if v_member_committee_id is distinct from v_meeting_committee_id
     or v_member_org is distinct from v_meeting_org then
    raise exception 'Meeting attendance contains a person who is not a member of this committee.';
  end if;

  if new.employee_id is not null
     and v_member_employee_id is not null
     and new.employee_id is distinct from v_member_employee_id then
    raise exception 'Attendance employee does not match the committee member registry.';
  end if;

  -- Canonicalize registry-backed attendees. Manual members may legitimately
  -- have no employee_id but still have a first-class committee_member_id.
  new.employee_id := v_member_employee_id;
  return new;
end;
$$;

drop trigger if exists committee_meeting_attendee_membership_guard on public.committee_meeting_attendees;
create trigger committee_meeting_attendee_membership_guard
before insert or update of organization_id, meeting_id, committee_member_id, employee_id
on public.committee_meeting_attendees
for each row execute function public.guard_committee_meeting_attendee_membership();

commit;

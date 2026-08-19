-- ISO/JCI hardening: committee meeting governance.
-- Meetings remain embedded JSON for simple UX, while finalized minutes receive database validation.
begin;

create or replace function public.validate_committee_meeting_governance()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
declare
  meeting jsonb;
  attendance jsonb;
  member jsonb;
  total_count integer;
  present_count integer;
  required_count integer;
begin
  for meeting in select value from jsonb_array_elements(coalesce(new.meetings,'[]'::jsonb))
  loop
    if coalesce(meeting->>'status','Πρόχειρη')='Οριστικοποιημένη' then
      if nullif(btrim(coalesce(meeting->>'minutes','')),'') is null then
        raise exception 'Finalized committee meeting requires minutes.';
      end if;

      attendance := coalesce(meeting->'attendance','[]'::jsonb);
      total_count := jsonb_array_length(attendance);
      present_count := 0;
      for member in select value from jsonb_array_elements(attendance)
      loop
        if coalesce((member->>'present')::boolean,false) then
          present_count := present_count + 1;
        end if;
      end loop;
      required_count := greatest(1,ceil(total_count::numeric/2.0)::integer);

      if total_count>0 and present_count<required_count
         and nullif(btrim(coalesce(meeting->>'quorumOverrideReason','')),'') is null then
        raise exception 'Finalized committee meeting without quorum requires an exception reason.';
      end if;
    end if;
  end loop;
  return new;
end
$$;

drop trigger if exists committee_meeting_governance_guard on public.committees;
create trigger committee_meeting_governance_guard
before insert or update of meetings
on public.committees
for each row execute function public.validate_committee_meeting_governance();

commit;

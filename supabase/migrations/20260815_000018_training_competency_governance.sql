-- ISO/JCI hardening: training competency governance.
-- Competency details remain in the existing JSON data/attendance payload to keep the UI and schema lightweight.
begin;

create or replace function public.validate_training_competency_governance()
returns trigger
language plpgsql
set search_path=public
as $$
declare
  attendee jsonb;
begin
  if new.status='Ολοκληρωμένη'
     and coalesce((new.data->>'competencyRequired')::boolean,false) then
    for attendee in select value from jsonb_array_elements(coalesce(new.attendance,'[]'::jsonb))
    loop
      if coalesce(attendee->>'status','') in ('Παρών','Online')
         and nullif(btrim(coalesce(attendee->>'competencyResult','')),'') is null then
        raise exception 'Completed competency training requires an assessment result for each completed attendee.';
      end if;
    end loop;
  end if;
  return new;
end
$$;

drop trigger if exists training_competency_governance_guard on public.training_records;
create trigger training_competency_governance_guard
before insert or update of status,attendance,data
on public.training_records
for each row execute function public.validate_training_competency_governance();

commit;

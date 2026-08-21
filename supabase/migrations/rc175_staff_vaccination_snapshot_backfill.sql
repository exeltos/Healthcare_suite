
-- Healthcare Suite rc.175
-- Normalize existing staff vaccination records from authoritative employee/department master data.
-- Safe across organizations because joins include organization_id.

update public.prevention_records pr
set
  department_id = e.department_id,
  record_date = coalesce(
    pr.record_date,
    case
      when coalesce(pr.data ->> 'date','') ~ '^\d{4}-\d{2}-\d{2}$'
      then (pr.data ->> 'date')::date
      else null
    end
  ),
  status = 'recorded',
  data =
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              coalesce(pr.data,'{}'::jsonb),
              '{employeeId}', to_jsonb(e.id::text), true
            ),
            '{employeeName}', to_jsonb(trim(concat_ws(' ', e.last_name, e.first_name))), true
          ),
          '{professionalCategory}', to_jsonb(coalesce(e.professional_category,'')), true
        ),
        '{department}', to_jsonb(coalesce(d.name,'')), true
      ),
      '{status}', '"recorded"'::jsonb, true
    )
from public.employees e
left join public.departments d
  on d.id = e.department_id
 and d.organization_id = e.organization_id
where pr.record_type = 'staff_vaccination'
  and pr.employee_id = e.id::text
  and pr.organization_id = e.organization_id;

-- Read-only verification after the update.
select
  pr.id,
  pr.employee_id,
  e.employee_code,
  e.last_name,
  e.first_name,
  pr.department_id,
  d.name as department_name,
  pr.record_date,
  pr.status,
  pr.data ->> 'employeeName' as snapshot_employee_name,
  pr.data ->> 'professionalCategory' as snapshot_professional_category,
  pr.data ->> 'department' as snapshot_department,
  pr.data ->> 'vaccine' as vaccine,
  pr.data ->> 'dose' as dose,
  pr.data ->> 'lot' as lot,
  pr.data ->> 'validUntil' as valid_until,
  pr.data ->> 'notes' as notes
from public.prevention_records pr
join public.employees e
  on e.id::text = pr.employee_id
 and e.organization_id = pr.organization_id
left join public.departments d
  on d.id = pr.department_id
 and d.organization_id = pr.organization_id
where pr.record_type = 'staff_vaccination'
order by pr.record_date desc nulls last, pr.created_at desc;

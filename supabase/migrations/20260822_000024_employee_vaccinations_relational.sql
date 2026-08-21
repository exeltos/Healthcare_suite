
-- Table employee_vaccinations and RLS were applied during rc.198 validation.
-- Optional safe legacy backfill from prevention_records:
insert into public.employee_vaccinations (
  organization_id, employee_id, department_id, vaccine, dose,
  vaccination_date, next_due_date, lot_number, provider, status,
  notes, created_by, created_at, updated_at
)
select
  pr.organization_id,
  pr.employee_id,
  pr.department_id,
  coalesce(pr.data->>'vaccine',''),
  coalesce(pr.data->>'dose',''),
  pr.record_date,
  case when (pr.data->>'validUntil') ~ '^\d{4}-\d{2}-\d{2}$'
       then (pr.data->>'validUntil')::date else null end,
  coalesce(pr.data->>'lot',''),
  coalesce(pr.data->>'provider',''),
  'Ολοκληρωμένος',
  coalesce(pr.data->>'notes',''),
  pr.created_by,
  pr.created_at,
  pr.updated_at
from public.prevention_records pr
where pr.record_type='staff_vaccination'
  and pr.employee_id is not null
  and pr.record_date is not null
  and nullif(pr.data->>'vaccine','') is not null
  and not exists (
    select 1 from public.employee_vaccinations ev
    where ev.organization_id=pr.organization_id
      and ev.employee_id=pr.employee_id
      and ev.vaccination_date=pr.record_date
      and lower(ev.vaccine)=lower(pr.data->>'vaccine')
  );

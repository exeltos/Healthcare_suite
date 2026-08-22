insert into public.waste_measurement_records (
  id, organization_id, department_id, record_date, waste_type,
  weight_kg, containers, patient_days, responsible,
  document_number, collection_company, notes,
  legacy_prevention_record_id, created_by, created_at, updated_at
)
select
  pr.id,
  pr.organization_id,
  coalesce(
    pr.department_id,
    (
      select d.id
      from public.departments d
      where d.organization_id=pr.organization_id
        and d.name=coalesce(pr.data->>'department','')
      limit 1
    )
  ),
  case
    when (pr.data->>'date') ~ '^\d{4}-\d{2}-\d{2}$'
      then (pr.data->>'date')::date
    when (pr.data->>'date') ~ '^\d{2}/\d{2}/\d{4}$'
      then to_date(pr.data->>'date','DD/MM/YYYY')
    else pr.record_date
  end,
  coalesce(pr.data->>'wasteType',''),
  nullif(pr.data->>'weightKg','')::numeric,
  nullif(pr.data->>'containers','')::numeric,
  nullif(pr.data->>'patientDays','')::numeric,
  coalesce(pr.data->>'responsible',''),
  coalesce(pr.data->>'documentNumber',''),
  coalesce(pr.data->>'collectionCompany',''),
  coalesce(pr.data->>'notes',''),
  pr.id,
  pr.created_by,
  pr.created_at,
  pr.updated_at
from public.prevention_records pr
where pr.record_type='waste'
  and not exists (
    select 1 from public.waste_measurement_records w
    where w.id=pr.id
  );

-- Quality workflow integrity: incidents, audits and CAPA.
begin;

alter table public.quality_incidents
  drop constraint if exists quality_incidents_date_required;
alter table public.quality_incidents
  add constraint quality_incidents_date_required check (incident_date is not null);

alter table public.quality_audits
  drop constraint if exists quality_audits_compliance_range;
alter table public.quality_audits
  add constraint quality_audits_compliance_range check (compliance is null or (compliance>=0 and compliance<=100));

alter table public.quality_capa
  drop constraint if exists quality_capa_effectiveness_date_check;
alter table public.quality_capa
  add constraint quality_capa_effectiveness_date_check
  check (effectiveness_date is null or effectiveness_status<>'Εκκρεμεί');

create or replace function public.validate_quality_capa_source()
returns trigger language plpgsql set search_path=public as $$
begin
  if nullif(new.source_id,'') is null then return new; end if;
  if new.source_type='Συμβάν' and not exists (
    select 1 from public.quality_incidents i where i.id=new.source_id and i.organization_id=new.organization_id
  ) then raise exception 'CAPA incident source must belong to the same organization.';
  elsif new.source_type='Audit' and not exists (
    select 1 from public.quality_audits a where a.id=new.source_id and a.organization_id=new.organization_id
  ) then raise exception 'CAPA audit source must belong to the same organization.';
  end if;
  return new;
end $$;

drop trigger if exists quality_capa_source_guard on public.quality_capa;
create trigger quality_capa_source_guard
before insert or update of organization_id,source_id,source_type
on public.quality_capa for each row execute function public.validate_quality_capa_source();

create or replace function public.validate_quality_audit_source()
returns trigger language plpgsql set search_path=public as $$
begin
  if nullif(new.source_id,'') is not null and not exists (
    select 1 from public.quality_incidents i where i.id=new.source_id and i.organization_id=new.organization_id
  ) then raise exception 'Audit incident source must belong to the same organization.';
  end if;
  return new;
end $$;

drop trigger if exists quality_audit_source_guard on public.quality_audits;
create trigger quality_audit_source_guard
before insert or update of organization_id,source_id
on public.quality_audits for each row execute function public.validate_quality_audit_source();

commit;

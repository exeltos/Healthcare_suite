-- Healthcare Suite ISO/JCI hardening: laboratory governance aligned to ISO 15189 concepts.
-- Adds sample acceptance/rejection, result validation traceability and critical-result communication.
begin;

alter table public.patient_samples
  add column if not exists sample_acceptance text not null default 'Αποδεκτό',
  add column if not exists rejection_reason text not null default '',
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by uuid references auth.users(id) on delete restrict,
  add column if not exists critical_result boolean not null default false,
  add column if not exists critical_communicated_to text not null default '',
  add column if not exists critical_communicated_at timestamptz,
  add column if not exists critical_communicated_by uuid references auth.users(id) on delete restrict;

alter table public.laboratory_source_samples
  add column if not exists sample_acceptance text not null default 'Αποδεκτό',
  add column if not exists rejection_reason text not null default '',
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by uuid references auth.users(id) on delete restrict,
  add column if not exists critical_result boolean not null default false,
  add column if not exists critical_communicated_to text not null default '',
  add column if not exists critical_communicated_at timestamptz,
  add column if not exists critical_communicated_by uuid references auth.users(id) on delete restrict;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='patient_samples_acceptance_check') then
    alter table public.patient_samples add constraint patient_samples_acceptance_check
      check (sample_acceptance in ('Αποδεκτό','Απορρίφθηκε'));
  end if;
  if not exists (select 1 from pg_constraint where conname='laboratory_source_samples_acceptance_check') then
    alter table public.laboratory_source_samples add constraint laboratory_source_samples_acceptance_check
      check (sample_acceptance in ('Αποδεκτό','Απορρίφθηκε'));
  end if;
end $$;

create or replace function public.validate_laboratory_governance()
returns trigger
language plpgsql
security invoker
set search_path=public
as $$
begin
  if new.sample_acceptance='Απορρίφθηκε' then
    if nullif(btrim(coalesce(new.rejection_reason,'')),'') is null then
      raise exception 'Rejected laboratory samples require a rejection reason.';
    end if;
    if new.status <> 'Εκκρεμεί' then
      raise exception 'Rejected laboratory samples cannot have a finalized result.';
    end if;
    new.validated_at := null;
    new.validated_by := null;
  end if;

  if new.status <> 'Εκκρεμεί' then
    if new.validated_at is null then new.validated_at := now(); end if;
    if new.validated_by is null then new.validated_by := auth.uid(); end if;
  else
    new.validated_at := null;
    new.validated_by := null;
  end if;

  if new.critical_result then
    if new.status='Εκκρεμεί' then
      raise exception 'A critical result must be a finalized laboratory result.';
    end if;
    if nullif(btrim(coalesce(new.critical_communicated_to,'')),'') is null
       or new.critical_communicated_at is null then
      raise exception 'Critical laboratory results require communication recipient and timestamp.';
    end if;
    if new.critical_communicated_by is null then new.critical_communicated_by := auth.uid(); end if;
  else
    new.critical_communicated_to := '';
    new.critical_communicated_at := null;
    new.critical_communicated_by := null;
  end if;

  return new;
end
$$;

drop trigger if exists patient_samples_laboratory_governance_guard on public.patient_samples;
create trigger patient_samples_laboratory_governance_guard
before insert or update of sample_acceptance,rejection_reason,status,validated_at,validated_by,critical_result,critical_communicated_to,critical_communicated_at,critical_communicated_by
on public.patient_samples
for each row execute function public.validate_laboratory_governance();

drop trigger if exists source_samples_laboratory_governance_guard on public.laboratory_source_samples;
create trigger source_samples_laboratory_governance_guard
before insert or update of sample_acceptance,rejection_reason,status,validated_at,validated_by,critical_result,critical_communicated_to,critical_communicated_at,critical_communicated_by
on public.laboratory_source_samples
for each row execute function public.validate_laboratory_governance();

create index if not exists patient_samples_org_critical_idx
  on public.patient_samples(organization_id,critical_result) where critical_result=true;
create index if not exists source_samples_org_critical_idx
  on public.laboratory_source_samples(organization_id,critical_result) where critical_result=true;

commit;

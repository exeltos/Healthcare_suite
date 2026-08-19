-- Healthcare Suite rc.135
-- Allow environmental samples to remain pending until Laboratory accepts/rejects them.
begin;

alter table public.laboratory_source_samples
  alter column sample_acceptance set default 'Εκκρεμεί';

alter table public.laboratory_source_samples
  drop constraint if exists laboratory_source_samples_acceptance_check;

alter table public.laboratory_source_samples
  add constraint laboratory_source_samples_acceptance_check
  check (sample_acceptance in ('Εκκρεμεί','Αποδεκτό','Απορρίφθηκε'));

commit;

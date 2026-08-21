alter table public.surveillance_cases
  add column if not exists assessment_classification text not null default '',
  add column if not exists infection_site text not null default '',
  add column if not exists symptom_onset_date date null,
  add column if not exists review_date date null,
  add column if not exists review_outcome text not null default '',
  add column if not exists close_result text not null default '',
  add column if not exists confirmation_date date null,
  add column if not exists confirming_sample_id text null,
  add column if not exists last_recheck_date date null,
  add column if not exists last_recheck_sample_id text null,
  add column if not exists reopened_at timestamptz null;

-- Existing production rows were backfilled and verified before rc.201.

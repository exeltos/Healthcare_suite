
alter table public.infections
  add column if not exists origin text not null default '',
  add column if not exists outcome text not null default '',
  add column if not exists closure_reason text not null default '',
  add column if not exists completed_date date null,
  add column if not exists cancellation_date date null,
  add column if not exists cancellation_reason text not null default '',
  add column if not exists verification_status text not null default '',
  add column if not exists auto_created_from_laboratory boolean not null default false;
-- Backfill was applied and verified before rc.200.

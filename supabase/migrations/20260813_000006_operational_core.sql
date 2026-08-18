-- Limoxis operational core: indicator configuration/source data, training, committees and controlled documents.
begin;

create table if not exists public.indicator_settings (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  indicator_id text not null,
  settings jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (organization_id,indicator_id)
);

create table if not exists public.custom_indicators (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.indicator_source_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null check(source_type in ('daily_census','antibiotic_ddd','structural_snapshot','prevalence_snapshot')),
  record_key text not null,
  record_date date,
  department_id uuid references public.departments(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,source_type,record_key)
);
create index if not exists indicator_source_org_type_date_idx on public.indicator_source_records(organization_id,source_type,record_date);

create table if not exists public.training_records (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  title text not null,
  category text not null default '',
  trainer text not null default '',
  training_date date,
  status text not null default 'Προγραμματισμένη',
  duration_hours numeric not null default 0,
  valid_until date,
  attendance jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists training_org_date_idx on public.training_records(organization_id,training_date);

create table if not exists public.committees (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  committee_type text not null default 'Επιτροπή',
  chair text not null default '',
  secretary text not null default '',
  last_meeting date,
  next_meeting date,
  status text not null default 'Ενεργή',
  frequency text not null default '',
  member_ids jsonb not null default '[]'::jsonb,
  members jsonb not null default '[]'::jsonb,
  agenda jsonb not null default '[]'::jsonb,
  meetings jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  purpose text not null default '',
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.controlled_documents (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  code text not null default '',
  category text not null default '',
  version text not null default '',
  owner text not null default '',
  status text not null default 'Σε ισχύ',
  review_date date,
  attachments jsonb not null default '[]'::jsonb,
  versions jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,code)
);
create index if not exists controlled_documents_org_review_idx on public.controlled_documents(organization_id,review_date);

drop trigger if exists custom_indicators_set_updated_at on public.custom_indicators;
create trigger custom_indicators_set_updated_at before update on public.custom_indicators for each row execute function public.set_updated_at();
drop trigger if exists indicator_source_records_set_updated_at on public.indicator_source_records;
create trigger indicator_source_records_set_updated_at before update on public.indicator_source_records for each row execute function public.set_updated_at();
drop trigger if exists training_records_set_updated_at on public.training_records;
create trigger training_records_set_updated_at before update on public.training_records for each row execute function public.set_updated_at();
drop trigger if exists committees_set_updated_at on public.committees;
create trigger committees_set_updated_at before update on public.committees for each row execute function public.set_updated_at();
drop trigger if exists controlled_documents_set_updated_at on public.controlled_documents;
create trigger controlled_documents_set_updated_at before update on public.controlled_documents for each row execute function public.set_updated_at();

create or replace function public.can_manage_operational()
returns boolean language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.user_profiles p
  where p.user_id=(select auth.uid()) and p.status='active'
   and (p.role in ('admin','infection_lead') or p.capabilities && array['training','committees','documents']::text[])
 )
$$;
grant execute on function public.can_manage_operational() to authenticated;

alter table public.indicator_settings enable row level security;
alter table public.custom_indicators enable row level security;
alter table public.indicator_source_records enable row level security;
alter table public.training_records enable row level security;
alter table public.committees enable row level security;
alter table public.controlled_documents enable row level security;

drop policy if exists indicator_settings_org on public.indicator_settings;
create policy indicator_settings_org on public.indicator_settings for all to authenticated
using (organization_id=(select public.current_organization_id()))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_quality());

drop policy if exists custom_indicators_org on public.custom_indicators;
create policy custom_indicators_org on public.custom_indicators for all to authenticated
using (organization_id=(select public.current_organization_id()))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_quality());

drop policy if exists indicator_source_records_org on public.indicator_source_records;
create policy indicator_source_records_org on public.indicator_source_records for all to authenticated
using (organization_id=(select public.current_organization_id()))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_quality());

drop policy if exists training_records_org on public.training_records;
create policy training_records_org on public.training_records for all to authenticated
using (organization_id=(select public.current_organization_id()) and (department_id is null or public.has_department_access(department_id) or public.can_manage_operational()))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_operational());

drop policy if exists committees_org on public.committees;
create policy committees_org on public.committees for all to authenticated
using (organization_id=(select public.current_organization_id()))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_operational());

drop policy if exists controlled_documents_org on public.controlled_documents;
create policy controlled_documents_org on public.controlled_documents for all to authenticated
using (organization_id=(select public.current_organization_id()))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_operational());

grant select,insert,update,delete on public.indicator_settings,public.custom_indicators,public.indicator_source_records,public.training_records,public.committees,public.controlled_documents to authenticated;
commit;

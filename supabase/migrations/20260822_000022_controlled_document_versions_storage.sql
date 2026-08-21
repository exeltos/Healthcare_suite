
begin;

create table if not exists public.controlled_document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id text not null references public.controlled_documents(id) on delete cascade,
  version text not null,
  title text not null,
  code text not null default '',
  category text not null default '',
  status text not null default 'Σε ισχύ',
  change_summary text not null default '',
  effective_date date null,
  review_date date null,
  prepared_by_user_id uuid null references auth.users(id) on delete set null,
  prepared_by_name text not null default '',
  prepared_at timestamptz null,
  reviewed_by_user_id uuid null references auth.users(id) on delete set null,
  reviewed_by_name text not null default '',
  reviewed_at timestamptz null,
  approved_by_user_id uuid null references auth.users(id) on delete set null,
  approved_by_name text not null default '',
  approved_at timestamptz null,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  constraint controlled_document_versions_document_version_unique unique (document_id, version)
);

create index if not exists controlled_document_versions_org_idx on public.controlled_document_versions(organization_id);
create index if not exists controlled_document_versions_document_idx on public.controlled_document_versions(document_id, created_at desc);
create index if not exists controlled_document_versions_code_idx on public.controlled_document_versions(organization_id, code);

create or replace function public.prevent_controlled_document_version_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  raise exception 'Published controlled document versions are immutable.';
end;
$$;

drop trigger if exists controlled_document_versions_no_update on public.controlled_document_versions;
create trigger controlled_document_versions_no_update before update on public.controlled_document_versions
for each row execute function public.prevent_controlled_document_version_change();

drop trigger if exists controlled_document_versions_no_delete on public.controlled_document_versions;
create trigger controlled_document_versions_no_delete before delete on public.controlled_document_versions
for each row execute function public.prevent_controlled_document_version_change();

alter table public.controlled_document_versions enable row level security;
drop policy if exists controlled_document_versions_select on public.controlled_document_versions;
drop policy if exists controlled_document_versions_insert on public.controlled_document_versions;

create policy controlled_document_versions_select on public.controlled_document_versions
for select to authenticated using (
  organization_id=public.current_organization_id()
  and public.has_module_action('Έγγραφα','view')
);

create policy controlled_document_versions_insert on public.controlled_document_versions
for insert to authenticated with check (
  organization_id=public.current_organization_id()
  and (public.has_module_action('Έγγραφα','create') or public.has_module_action('Έγγραφα','edit'))
  and created_by=auth.uid()
);

drop policy if exists attachments_select_owner_or_admin on public.attachments;
drop policy if exists attachments_insert_own_org on public.attachments;
drop policy if exists attachments_delete_owner_or_admin on public.attachments;
drop policy if exists attachments_select_scoped on public.attachments;
drop policy if exists attachments_insert_scoped on public.attachments;
drop policy if exists attachments_delete_scoped on public.attachments;

create policy attachments_select_scoped on public.attachments
for select to authenticated using (
  organization_id=public.current_organization_id()
  and (
    (entity_type in ('controlled_document','controlled_document_version') and public.has_module_action('Έγγραφα','view'))
    or
    (entity_type not in ('controlled_document','controlled_document_version') and (uploaded_by=auth.uid() or public.is_app_admin()))
  )
);

create policy attachments_insert_scoped on public.attachments
for insert to authenticated with check (
  organization_id=public.current_organization_id()
  and uploaded_by=auth.uid()
  and (
    (entity_type='controlled_document' and (public.has_module_action('Έγγραφα','create') or public.has_module_action('Έγγραφα','edit')))
    or
    (entity_type='controlled_document_version' and public.has_module_action('Έγγραφα','edit'))
    or entity_type not in ('controlled_document','controlled_document_version')
  )
);

create policy attachments_delete_scoped on public.attachments
for delete to authenticated using (
  organization_id=public.current_organization_id()
  and (
    (entity_type='controlled_document' and public.has_module_action('Έγγραφα','edit'))
    or
    (entity_type not in ('controlled_document','controlled_document_version') and (uploaded_by=auth.uid() or public.is_app_admin()))
  )
);

create unique index if not exists attachments_entity_object_unique
on public.attachments(organization_id,entity_type,entity_id,bucket,object_path);

commit;

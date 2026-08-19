-- Limoxis clinical support data: non-patient laboratory sources,
-- isolation episodes, patient attachment metadata and notifiable diseases.
begin;

create table if not exists public.laboratory_source_samples (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null check (source_type in ('Προσωπικό','Περιβάλλον','Νερό')),
  employee_id uuid references public.employees(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  subject_name text not null default '',
  subject_code text not null default '',
  sample_type text not null default '',
  sample_reason text not null default '',
  collection_date date,
  collection_time time,
  received_date date,
  result_date date,
  status text not null default 'Εκκρεμεί',
  microorganism text not null default '',
  resistance text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lab_source_org_type_idx on public.laboratory_source_samples(organization_id,source_type);
create index if not exists lab_source_org_department_idx on public.laboratory_source_samples(organization_id,department_id);

create table if not exists public.patient_isolations (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id text not null references public.patients(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  isolation_type text not null default '',
  status text not null default 'Ενεργή',
  start_date date,
  end_date date,
  reason text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists patient_isolations_org_patient_idx on public.patient_isolations(organization_id,patient_id);

create table if not exists public.patient_attachments (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id text not null references public.patients(id) on delete cascade,
  storage_path text,
  file_name text not null default '',
  mime_type text,
  file_size bigint,
  category text not null default '',
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists patient_attachments_org_patient_idx on public.patient_attachments(organization_id,patient_id);

create table if not exists public.notifiable_diseases (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id text references public.patients(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  disease text not null,
  deadline text not null default '',
  diagnosis_date date,
  declaration_date date,
  status text not null default 'Προς δήλωση',
  case_classification text not null default '',
  physician text not null default '',
  notes text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notifiable_org_status_idx on public.notifiable_diseases(organization_id,status);
create index if not exists notifiable_org_patient_idx on public.notifiable_diseases(organization_id,patient_id);

drop trigger if exists laboratory_source_samples_set_updated_at on public.laboratory_source_samples;
create trigger laboratory_source_samples_set_updated_at before update on public.laboratory_source_samples for each row execute function public.set_updated_at();
drop trigger if exists patient_isolations_set_updated_at on public.patient_isolations;
create trigger patient_isolations_set_updated_at before update on public.patient_isolations for each row execute function public.set_updated_at();
drop trigger if exists notifiable_diseases_set_updated_at on public.notifiable_diseases;
create trigger notifiable_diseases_set_updated_at before update on public.notifiable_diseases for each row execute function public.set_updated_at();

alter table public.laboratory_source_samples enable row level security;
alter table public.patient_isolations enable row level security;
alter table public.patient_attachments enable row level security;
alter table public.notifiable_diseases enable row level security;

drop policy if exists laboratory_source_samples_scoped on public.laboratory_source_samples;
create policy laboratory_source_samples_scoped on public.laboratory_source_samples for all to authenticated
using (organization_id=(select public.current_organization_id()) and public.can_manage_clinical() and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_clinical() and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists patient_isolations_scoped on public.patient_isolations;
create policy patient_isolations_scoped on public.patient_isolations for all to authenticated
using (organization_id=(select public.current_organization_id()) and public.can_manage_clinical() and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_clinical() and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists patient_attachments_select_scoped on public.patient_attachments;
create policy patient_attachments_select_scoped on public.patient_attachments for select to authenticated
using (organization_id=(select public.current_organization_id()) and public.can_manage_clinical());
drop policy if exists patient_attachments_write_scoped on public.patient_attachments;
create policy patient_attachments_write_scoped on public.patient_attachments for all to authenticated
using (organization_id=(select public.current_organization_id()) and public.can_manage_clinical())
with check (organization_id=(select public.current_organization_id()) and public.can_manage_clinical());

drop policy if exists notifiable_diseases_scoped on public.notifiable_diseases;
create policy notifiable_diseases_scoped on public.notifiable_diseases for all to authenticated
using (organization_id=(select public.current_organization_id()) and public.can_manage_clinical() and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=(select public.current_organization_id()) and public.can_manage_clinical() and (department_id is null or public.can_access_clinical_department(department_id)));

grant select,insert,update,delete on public.laboratory_source_samples,public.patient_isolations,public.patient_attachments,public.notifiable_diseases to authenticated;

-- Private bucket. Actual binary upload is introduced through the storage adapter;
-- metadata is never stored as a browser blob.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('patientattachments','patientattachments',false,26214400,array['application/pdf','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists patientattachments_select on storage.objects;
create policy patientattachments_select on storage.objects for select to authenticated
using (bucket_id='patientattachments' and (storage.foldername(name))[1]=(select public.current_organization_id())::text);

drop policy if exists patientattachments_insert on storage.objects;
create policy patientattachments_insert on storage.objects for insert to authenticated
with check (bucket_id='patientattachments' and (storage.foldername(name))[1]=(select public.current_organization_id())::text and public.can_manage_clinical());

drop policy if exists patientattachments_delete on storage.objects;
create policy patientattachments_delete on storage.objects for delete to authenticated
using (bucket_id='patientattachments' and (storage.foldername(name))[1]=(select public.current_organization_id())::text and public.can_manage_clinical());

commit;

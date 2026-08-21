begin;
create table if not exists public.committee_members (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 committee_id text not null references public.committees(id) on delete cascade, employee_id uuid references public.employees(id) on delete set null,
 full_name text not null default '', role text not null default 'Μέλος', duties text not null default '', professional_category text not null default '',
 department_id uuid references public.departments(id) on delete set null, department_name text not null default '', is_manual boolean not null default false,
 is_active boolean not null default true, start_date date, end_date date, created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists committee_members_org_committee_idx on public.committee_members(organization_id,committee_id);
create index if not exists committee_members_org_employee_idx on public.committee_members(organization_id,employee_id);
create unique index if not exists committee_members_active_employee_unique on public.committee_members(organization_id,committee_id,employee_id) where employee_id is not null and is_active=true;

create table if not exists public.committee_meetings (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 committee_id text not null references public.committees(id) on delete cascade, meeting_date date not null, start_time time, end_time time,
 location text not null default '', status text not null default 'Προγραμματισμένη', title text not null default '', notes text not null default '',
 created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists committee_meetings_org_committee_date_idx on public.committee_meetings(organization_id,committee_id,meeting_date);

create table if not exists public.committee_meeting_attendees (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 meeting_id uuid not null references public.committee_meetings(id) on delete cascade, committee_member_id uuid references public.committee_members(id) on delete set null,
 employee_id uuid references public.employees(id) on delete set null, full_name text not null default '', role text not null default '',
 attendance_status text not null default 'Παρόν', attendance_notes text not null default '', created_at timestamptz not null default now());
create index if not exists committee_attendees_org_meeting_idx on public.committee_meeting_attendees(organization_id,meeting_id);
create unique index if not exists committee_attendees_member_unique on public.committee_meeting_attendees(meeting_id,committee_member_id) where committee_member_id is not null;

create table if not exists public.committee_agenda_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 meeting_id uuid not null references public.committee_meetings(id) on delete cascade, position integer not null default 1,
 title text not null, description text not null default '', presenter text not null default '', status text not null default 'Προς συζήτηση',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists committee_agenda_org_meeting_idx on public.committee_agenda_items(organization_id,meeting_id,position);

create table if not exists public.committee_decisions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 committee_id text not null references public.committees(id) on delete cascade, meeting_id uuid references public.committee_meetings(id) on delete set null,
 agenda_item_id uuid references public.committee_agenda_items(id) on delete set null, decision_date date not null default current_date,
 title text not null, decision_text text not null default '', responsible_employee_id uuid references public.employees(id) on delete set null,
 responsible_name text not null default '', due_date date, status text not null default 'Ανοιχτή', completed_at timestamptz,
 created_by uuid not null references auth.users(id) on delete restrict, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists committee_decisions_org_committee_idx on public.committee_decisions(organization_id,committee_id,decision_date);
create index if not exists committee_decisions_status_idx on public.committee_decisions(organization_id,status,due_date);

do $$ begin
 if not exists(select 1 from pg_trigger where tgname='committee_members_set_updated_at') then create trigger committee_members_set_updated_at before update on public.committee_members for each row execute function public.set_updated_at(); end if;
 if not exists(select 1 from pg_trigger where tgname='committee_meetings_set_updated_at') then create trigger committee_meetings_set_updated_at before update on public.committee_meetings for each row execute function public.set_updated_at(); end if;
 if not exists(select 1 from pg_trigger where tgname='committee_agenda_items_set_updated_at') then create trigger committee_agenda_items_set_updated_at before update on public.committee_agenda_items for each row execute function public.set_updated_at(); end if;
 if not exists(select 1 from pg_trigger where tgname='committee_decisions_set_updated_at') then create trigger committee_decisions_set_updated_at before update on public.committee_decisions for each row execute function public.set_updated_at(); end if;
end $$;

insert into public.committee_members(organization_id,committee_id,employee_id,full_name,role,duties,professional_category,department_id,department_name,is_manual,is_active,created_by)
select c.organization_id,c.id,case when nullif(m.member->>'employeeId','') is not null then (m.member->>'employeeId')::uuid end,
 coalesce(m.member->>'fullName',''),coalesce(nullif(m.member->>'role',''),'Μέλος'),coalesce(m.member->>'duties',''),coalesce(m.member->>'capacity',''),
 e.department_id,coalesce(d.name,m.member->>'department',''),coalesce((m.member->>'manual')::boolean,false),true,coalesce(auth.uid(),c.created_by)
from public.committees c cross join lateral jsonb_array_elements(coalesce(c.members,'[]'::jsonb)) m(member)
left join public.employees e on e.id=case when nullif(m.member->>'employeeId','') is not null then (m.member->>'employeeId')::uuid end and e.organization_id=c.organization_id
left join public.departments d on d.id=e.department_id and d.organization_id=c.organization_id
where not exists(select 1 from public.committee_members cm where cm.organization_id=c.organization_id and cm.committee_id=c.id and ((cm.employee_id is not null and cm.employee_id=case when nullif(m.member->>'employeeId','') is not null then (m.member->>'employeeId')::uuid end) or (cm.employee_id is null and lower(trim(cm.full_name))=lower(trim(coalesce(m.member->>'fullName',''))))));

update public.committees c set member_ids=coalesce((select jsonb_agg(cm.employee_id::text order by cm.created_at) from public.committee_members cm where cm.committee_id=c.id and cm.organization_id=c.organization_id and cm.is_active=true and cm.employee_id is not null),'[]'::jsonb);

alter table public.committee_members enable row level security; alter table public.committee_meetings enable row level security;
alter table public.committee_meeting_attendees enable row level security; alter table public.committee_agenda_items enable row level security; alter table public.committee_decisions enable row level security;
drop policy if exists committee_members_scoped on public.committee_members;
create policy committee_members_scoped on public.committee_members for all to authenticated using (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',false)) with check (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',true));
drop policy if exists committee_meetings_scoped on public.committee_meetings;
create policy committee_meetings_scoped on public.committee_meetings for all to authenticated using (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',false)) with check (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',true));
drop policy if exists committee_meeting_attendees_scoped on public.committee_meeting_attendees;
create policy committee_meeting_attendees_scoped on public.committee_meeting_attendees for all to authenticated using (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',false)) with check (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',true));
drop policy if exists committee_agenda_items_scoped on public.committee_agenda_items;
create policy committee_agenda_items_scoped on public.committee_agenda_items for all to authenticated using (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',false)) with check (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',true));
drop policy if exists committee_decisions_scoped on public.committee_decisions;
create policy committee_decisions_scoped on public.committee_decisions for all to authenticated using (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',false)) with check (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',true));
commit;

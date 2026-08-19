-- Align frontend module permissions with authoritative Supabase RLS.
begin;

create or replace function public.module_access_level(target_module text)
returns text
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  app_role text;
  configured text;
begin
  app_role:=public.current_app_role();
  if app_role is null then return 'Χωρίς πρόσβαση'; end if;

  select rpc.permissions->>app_role
    into configured
  from public.role_permission_configuration rpc
  where rpc.organization_id=public.current_organization_id()
    and rpc.module_key=target_module
  limit 1;

  if configured is not null then return configured; end if;

  return case target_module
    when 'Κεντρική εικόνα' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης' when 'infection_liaison' then 'Προβολή στα επιτρεπόμενα τμήματα' when 'medical_reviewer' then 'Προβολή' when 'department_user' then 'Προβολή στα επιτρεπόμενα τμήματα' when 'laboratory' then 'Προβολή' else 'Χωρίς πρόσβαση' end
    when 'Εργαστήριο' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Προβολή · Καταχώρηση · Επεξεργασία' when 'medical_reviewer' then 'Προβολή · Καταχώρηση · Επεξεργασία' when 'department_user' then 'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα' when 'laboratory' then 'Πλήρης λειτουργική' else 'Χωρίς πρόσβαση' end
    when 'Ασθενείς' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Προβολή · Καταχώρηση · Επεξεργασία' when 'medical_reviewer' then 'Προβολή · Καταχώρηση · Επεξεργασία' when 'department_user' then 'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα' when 'laboratory' then 'Προβολή' else 'Χωρίς πρόσβαση' end
    when 'Προσωπικό' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Προβολή · Επεξεργασία στα επιτρεπόμενα τμήματα' when 'medical_reviewer' then 'Προβολή' when 'department_user' then 'Με πρόσθετη αρμοδιότητα' when 'laboratory' then 'Προβολή' else 'Χωρίς πρόσβαση' end
    when 'Νερό' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Προβολή · Καταχώρηση · Επεξεργασία' when 'medical_reviewer' then 'Προβολή' when 'department_user' then 'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα' when 'laboratory' then 'Προβολή · Καταχώρηση · Επεξεργασία' else 'Χωρίς πρόσβαση' end
    when 'Επιφάνειες' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Προβολή · Καταχώρηση · Επεξεργασία' when 'medical_reviewer' then 'Προβολή' when 'department_user' then 'Προβολή · Καταχώρηση στα επιτρεπόμενα τμήματα' when 'laboratory' then 'Προβολή · Καταχώρηση · Επεξεργασία' else 'Χωρίς πρόσβαση' end
    when 'Δηλούμενα Νοσήματα' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Πλήρης λειτουργική' when 'medical_reviewer' then 'Προβολή' else 'Χωρίς πρόσβαση' end
    when 'Υγιεινή Χεριών' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Πλήρης λειτουργική' when 'medical_reviewer' then 'Προβολή' when 'department_user' then 'Με πρόσθετη αρμοδιότητα' else 'Χωρίς πρόσβαση' end
    when 'Εμβολιασμοί' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Προβολή · Επεξεργασία στα επιτρεπόμενα τμήματα' when 'medical_reviewer' then 'Προβολή' else 'Χωρίς πρόσβαση' end
    when 'Προωθημένα Αντιβιοτικά' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Προβολή · Διαχείριση' when 'medical_reviewer' then 'Πλήρης λειτουργική' when 'department_user' then 'Προβολή' when 'laboratory' then 'Προβολή' else 'Χωρίς πρόσβαση' end
    when 'Αντισηπτικά / Απόβλητα' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Προβολή · Καταχώρηση' when 'medical_reviewer' then 'Προβολή' when 'department_user' then 'Καταχώρηση στο επιτρεπόμενο τμήμα' else 'Χωρίς πρόσβαση' end
    when 'Κέντρο Ποιότητας' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Προβολή · Καταχώρηση · Επεξεργασία' when 'infection_liaison' then 'Προβολή' when 'medical_reviewer' then 'Προβολή · Καταχώρηση' when 'department_user' then 'Με πρόσθετη αρμοδιότητα' else 'Χωρίς πρόσβαση' end
    when 'Επιτροπές' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' else 'Με πρόσθετη αρμοδιότητα' end
    when 'Εκπαίδευση' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Προβολή · Διαχείριση' when 'medical_reviewer' then 'Προβολή' when 'department_user' then 'Προβολή στο επιτρεπόμενο τμήμα' when 'laboratory' then 'Προβολή' else 'Χωρίς πρόσβαση' end
    when 'Έγγραφα' then case app_role when 'admin' then 'Πλήρης' when 'infection_lead' then 'Πλήρης λειτουργική' when 'infection_liaison' then 'Προβολή στα επιτρεπόμενα τμήματα' when 'medical_reviewer' then 'Προβολή' when 'department_user' then 'Προβολή στα επιτρεπόμενα τμήματα' when 'laboratory' then 'Προβολή' else 'Χωρίς πρόσβαση' end
    when 'LIRA AI' then case app_role when 'admin' then 'Πλήρης' else 'Με πρόσθετη αρμοδιότητα' end
    when 'Κέντρο Διαχείρισης' then case app_role when 'admin' then 'Πλήρης' else 'Χωρίς πρόσβαση' end
    else 'Χωρίς πρόσβαση'
  end;
end
$$;

create or replace function public.module_capability_key(target_module text)
returns text
language sql
immutable
as $$
  select case target_module
    when 'Προσωπικό' then 'staff_directory'
    when 'Υγιεινή Χεριών' then 'hand_hygiene_observer'
    when 'Κέντρο Ποιότητας' then 'quality'
    when 'Επιτροπές' then 'committees'
    when 'Εκπαίδευση' then 'training'
    when 'Έγγραφα' then 'documents'
    when 'Εργαστήριο' then 'laboratory'
    when 'LIRA AI' then 'lira'
    else null
  end
$$;

create or replace function public.has_module_access(target_module text, write_access boolean default false)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  access_level text;
  capability_key text;
begin
  access_level:=public.module_access_level(target_module);
  if access_level is null or access_level='Χωρίς πρόσβαση' then return false; end if;

  if access_level='Με πρόσθετη αρμοδιότητα' then
    capability_key:=public.module_capability_key(target_module);
    return capability_key is not null and exists(
      select 1 from public.user_profiles p
      where p.user_id=auth.uid()
        and p.status='active'
        and capability_key=any(coalesce(p.capabilities,'{}'::text[]))
    );
  end if;

  if not write_access then return true; end if;

  return access_level not in (
    'Προβολή',
    'Προβολή στο επιτρεπόμενο τμήμα',
    'Προβολή στα επιτρεπόμενα τμήματα',
    'Περιορισμένη προβολή'
  );
end
$$;

create or replace function public.get_my_module_access()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(jsonb_object_agg(module_name,public.module_access_level(module_name)),'{}'::jsonb)
  from unnest(array[
    'Κεντρική εικόνα','Εργαστήριο','Ασθενείς','Προσωπικό','Νερό','Επιφάνειες',
    'Δηλούμενα Νοσήματα','Υγιεινή Χεριών','Εμβολιασμοί','Προωθημένα Αντιβιοτικά',
    'Αντισηπτικά / Απόβλητα','Κέντρο Ποιότητας','Επιτροπές','Εκπαίδευση',
    'Έγγραφα','LIRA AI','Κέντρο Διαχείρισης'
  ]::text[]) as modules(module_name)
$$;

grant execute on function public.get_my_module_access() to authenticated;
grant execute on function public.has_module_access(text,boolean) to authenticated;

create or replace function public.prevention_module_for(record_kind text)
returns text
language sql
immutable
as $$
  select case record_kind
    when 'hand_hygiene' then 'Υγιεινή Χεριών'
    when 'staff_vaccination' then 'Εμβολιασμοί'
    when 'promoted_antibiotic' then 'Προωθημένα Αντιβιοτικά'
    when 'antiseptic' then 'Αντισηπτικά / Απόβλητα'
    when 'waste' then 'Αντισηπτικά / Απόβλητα'
    when 'prevention_audit' then 'Υγιεινή Χεριών'
    else 'Υγιεινή Χεριών'
  end
$$;

-- Clinical registry: Laboratory can read related patients but no longer modify patient registry.
drop policy if exists patients_write_scoped on public.patients;
create policy patients_write_scoped on public.patients for all to authenticated
using (
  organization_id=public.current_organization_id()
  and public.has_module_access('Ασθενείς',true)
  and (department_id is null or public.can_access_clinical_department(department_id))
)
with check (
  organization_id=public.current_organization_id()
  and public.has_module_access('Ασθενείς',true)
  and (department_id is null or public.can_access_clinical_department(department_id))
);

drop policy if exists surveillance_write_scoped on public.surveillance_cases;
create policy surveillance_write_scoped on public.surveillance_cases for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Ασθενείς',true) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_access('Ασθενείς',true) and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists infections_write_scoped on public.infections;
create policy infections_write_scoped on public.infections for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Ασθενείς',true) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_access('Ασθενείς',true) and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists patient_samples_write_scoped on public.patient_samples;
create policy patient_samples_write_scoped on public.patient_samples for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Εργαστήριο',true) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_access('Εργαστήριο',true) and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists laboratory_source_samples_scoped on public.laboratory_source_samples;
create policy laboratory_source_samples_scoped on public.laboratory_source_samples for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Εργαστήριο',false) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_access('Εργαστήριο',true) and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists patient_isolations_scoped on public.patient_isolations;
create policy patient_isolations_scoped on public.patient_isolations for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Ασθενείς',false) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_access('Ασθενείς',true) and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists notifiable_diseases_scoped on public.notifiable_diseases;
create policy notifiable_diseases_scoped on public.notifiable_diseases for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Δηλούμενα Νοσήματα',false) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_access('Δηλούμενα Νοσήματα',true) and (department_id is null or public.can_access_clinical_department(department_id)));

-- Quality: department users require the explicit Quality capability instead of receiving write access by role alone.
drop policy if exists quality_incidents_scoped on public.quality_incidents;
create policy quality_incidents_scoped on public.quality_incidents for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Κέντρο Ποιότητας',false) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_access('Κέντρο Ποιότητας',true) and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists quality_capa_scoped on public.quality_capa;
create policy quality_capa_scoped on public.quality_capa for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Κέντρο Ποιότητας',false) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_access('Κέντρο Ποιότητας',true) and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists quality_audits_scoped on public.quality_audits;
create policy quality_audits_scoped on public.quality_audits for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Κέντρο Ποιότητας',false) and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_access('Κέντρο Ποιότητας',true) and (department_id is null or public.can_access_clinical_department(department_id)));

-- Organizational modules: each capability controls only its own module.
drop policy if exists training_records_org on public.training_records;
create policy training_records_org on public.training_records for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Εκπαίδευση',false) and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')))
with check (organization_id=public.current_organization_id() and public.has_module_access('Εκπαίδευση',true) and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')));

drop policy if exists committees_org on public.committees;
create policy committees_org on public.committees for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',false))
with check (organization_id=public.current_organization_id() and public.has_module_access('Επιτροπές',true));

drop policy if exists controlled_documents_org on public.controlled_documents;
create policy controlled_documents_org on public.controlled_documents for all to authenticated
using (organization_id=public.current_organization_id() and public.has_module_access('Έγγραφα',false))
with check (organization_id=public.current_organization_id() and public.has_module_access('Έγγραφα',true));

drop policy if exists prevention_records_org on public.prevention_records;
create policy prevention_records_org on public.prevention_records for all to authenticated
using (
  organization_id=public.current_organization_id()
  and public.has_module_access(public.prevention_module_for(record_type),false)
  and (department_id is null or public.can_access_clinical_department(department_id))
)
with check (
  organization_id=public.current_organization_id()
  and public.has_module_access(public.prevention_module_for(record_type),true)
  and (department_id is null or public.can_access_clinical_department(department_id))
);

-- Role configuration remains administrator-only, but all users can obtain only their own effective matrix through the safe RPC.
drop policy if exists role_permission_configuration_org on public.role_permission_configuration;
create policy role_permission_configuration_org on public.role_permission_configuration for all to authenticated
using (organization_id=public.current_organization_id() and public.is_app_admin())
with check (organization_id=public.current_organization_id() and public.is_app_admin());


-- Granular action semantics: create/edit/delete are distinct, so "entry" does not imply deletion.
create or replace function public.has_module_action(target_module text, target_action text)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  access_level text;
  capability_key text;
  has_capability boolean;
begin
  access_level:=public.module_access_level(target_module);
  if access_level is null or access_level='Χωρίς πρόσβαση' then return false; end if;

  if access_level='Με πρόσθετη αρμοδιότητα' then
    capability_key:=public.module_capability_key(target_module);
    select exists(
      select 1 from public.user_profiles p
      where p.user_id=auth.uid()
        and p.status='active'
        and capability_key is not null
        and capability_key=any(coalesce(p.capabilities,'{}'::text[]))
    ) into has_capability;
    if not has_capability then return false; end if;
    return true;
  end if;

  if target_action='view' then return true; end if;

  if access_level in ('Προβολή','Προβολή στο επιτρεπόμενο τμήμα','Προβολή στα επιτρεπόμενα τμήματα','Περιορισμένη προβολή') then
    return false;
  end if;

  if access_level in ('Πλήρης','Πλήρης λειτουργική') or position('Διαχείριση' in access_level)>0 then
    return true;
  end if;

  if target_action='create' then return position('Καταχώρηση' in access_level)>0; end if;
  if target_action='edit' then return position('Επεξεργασία' in access_level)>0; end if;
  if target_action='delete' then return false; end if;
  return false;
end
$$;

grant execute on function public.has_module_action(text,text) to authenticated;

-- Employee directory writes follow the Staff matrix and department scope.
drop policy if exists employees_admin_write on public.employees;
drop policy if exists employees_insert_scoped on public.employees;
drop policy if exists employees_update_scoped on public.employees;
drop policy if exists employees_delete_scoped on public.employees;
create policy employees_insert_scoped on public.employees for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Προσωπικό','create') and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')));
create policy employees_update_scoped on public.employees for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Προσωπικό','edit') and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')))
with check (organization_id=public.current_organization_id() and public.has_module_action('Προσωπικό','edit') and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')));
create policy employees_delete_scoped on public.employees for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Προσωπικό','delete') and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')));

-- Replace broad FOR ALL write policies with action-specific policies.
drop policy if exists patients_write_scoped on public.patients;
drop policy if exists patients_insert_scoped on public.patients;
drop policy if exists patients_update_scoped on public.patients;
drop policy if exists patients_delete_scoped on public.patients;
create policy patients_insert_scoped on public.patients for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy patients_update_scoped on public.patients for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy patients_delete_scoped on public.patients for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists surveillance_write_scoped on public.surveillance_cases;
drop policy if exists surveillance_insert_scoped on public.surveillance_cases;
drop policy if exists surveillance_update_scoped on public.surveillance_cases;
drop policy if exists surveillance_delete_scoped on public.surveillance_cases;
create policy surveillance_insert_scoped on public.surveillance_cases for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy surveillance_update_scoped on public.surveillance_cases for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy surveillance_delete_scoped on public.surveillance_cases for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists infections_write_scoped on public.infections;
drop policy if exists infections_insert_scoped on public.infections;
drop policy if exists infections_update_scoped on public.infections;
drop policy if exists infections_delete_scoped on public.infections;
create policy infections_insert_scoped on public.infections for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy infections_update_scoped on public.infections for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy infections_delete_scoped on public.infections for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists patient_samples_write_scoped on public.patient_samples;
drop policy if exists patient_samples_insert_scoped on public.patient_samples;
drop policy if exists patient_samples_update_scoped on public.patient_samples;
drop policy if exists patient_samples_delete_scoped on public.patient_samples;
create policy patient_samples_insert_scoped on public.patient_samples for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Εργαστήριο','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy patient_samples_update_scoped on public.patient_samples for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Εργαστήριο','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Εργαστήριο','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy patient_samples_delete_scoped on public.patient_samples for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Εργαστήριο','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists laboratory_source_samples_scoped on public.laboratory_source_samples;
drop policy if exists laboratory_source_samples_select on public.laboratory_source_samples;
drop policy if exists laboratory_source_samples_insert on public.laboratory_source_samples;
drop policy if exists laboratory_source_samples_update on public.laboratory_source_samples;
drop policy if exists laboratory_source_samples_delete on public.laboratory_source_samples;
create policy laboratory_source_samples_select on public.laboratory_source_samples for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Εργαστήριο','view') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy laboratory_source_samples_insert on public.laboratory_source_samples for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Εργαστήριο','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy laboratory_source_samples_update on public.laboratory_source_samples for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Εργαστήριο','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Εργαστήριο','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy laboratory_source_samples_delete on public.laboratory_source_samples for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Εργαστήριο','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists patient_isolations_scoped on public.patient_isolations;
create policy patient_isolations_select on public.patient_isolations for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','view') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy patient_isolations_insert on public.patient_isolations for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy patient_isolations_update on public.patient_isolations for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy patient_isolations_delete on public.patient_isolations for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists notifiable_diseases_scoped on public.notifiable_diseases;
create policy notifiable_diseases_select on public.notifiable_diseases for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Δηλούμενα Νοσήματα','view') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy notifiable_diseases_insert on public.notifiable_diseases for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Δηλούμενα Νοσήματα','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy notifiable_diseases_update on public.notifiable_diseases for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Δηλούμενα Νοσήματα','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Δηλούμενα Νοσήματα','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy notifiable_diseases_delete on public.notifiable_diseases for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Δηλούμενα Νοσήματα','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

-- Patient attachment metadata and Storage now require Patient-module permissions.
drop policy if exists patient_attachments_select_scoped on public.patient_attachments;
drop policy if exists patient_attachments_write_scoped on public.patient_attachments;
create policy patient_attachments_select_scoped on public.patient_attachments for select to authenticated
using (
  organization_id=public.current_organization_id()
  and public.has_module_action('Ασθενείς','view')
  and exists(select 1 from public.patients p where p.id=patient_id and p.organization_id=public.current_organization_id() and (p.department_id is null or public.can_access_clinical_department(p.department_id)))
);
create policy patient_attachments_insert_scoped on public.patient_attachments for insert to authenticated
with check (
  organization_id=public.current_organization_id()
  and public.has_module_action('Ασθενείς','create')
  and exists(select 1 from public.patients p where p.id=patient_id and p.organization_id=public.current_organization_id() and (p.department_id is null or public.can_access_clinical_department(p.department_id)))
);
create policy patient_attachments_update_scoped on public.patient_attachments for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit'))
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit'));
create policy patient_attachments_delete_scoped on public.patient_attachments for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','delete'));

drop policy if exists patientattachments_insert on storage.objects;
create policy patientattachments_insert on storage.objects for insert to authenticated
with check (bucket_id='patientattachments' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.has_module_action('Ασθενείς','create'));
drop policy if exists patientattachments_delete on storage.objects;
create policy patientattachments_delete on storage.objects for delete to authenticated
using (bucket_id='patientattachments' and (storage.foldername(name))[1]=public.current_organization_id()::text and public.has_module_action('Ασθενείς','delete'));

-- Quality tables: view is separate from mutation; view-only roles cannot delete through the API.
drop policy if exists quality_incidents_scoped on public.quality_incidents;
create policy quality_incidents_select on public.quality_incidents for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','view') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy quality_incidents_insert on public.quality_incidents for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy quality_incidents_update on public.quality_incidents for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy quality_incidents_delete on public.quality_incidents for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists quality_capa_scoped on public.quality_capa;
create policy quality_capa_select on public.quality_capa for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','view') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy quality_capa_insert on public.quality_capa for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy quality_capa_update on public.quality_capa for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy quality_capa_delete on public.quality_capa for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists quality_audits_scoped on public.quality_audits;
create policy quality_audits_select on public.quality_audits for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','view') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy quality_audits_insert on public.quality_audits for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy quality_audits_update on public.quality_audits for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy quality_audits_delete on public.quality_audits for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

-- Organizational records.
drop policy if exists training_records_org on public.training_records;
create policy training_records_select on public.training_records for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Εκπαίδευση','view') and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')));
create policy training_records_insert on public.training_records for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Εκπαίδευση','create') and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')));
create policy training_records_update on public.training_records for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Εκπαίδευση','edit') and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')))
with check (organization_id=public.current_organization_id() and public.has_module_action('Εκπαίδευση','edit') and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')));
create policy training_records_delete on public.training_records for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Εκπαίδευση','delete') and (department_id is null or public.has_department_access(department_id) or public.current_app_role() in ('admin','infection_lead')));

drop policy if exists committees_org on public.committees;
create policy committees_select on public.committees for select to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Επιτροπές','view'));
create policy committees_insert on public.committees for insert to authenticated with check (organization_id=public.current_organization_id() and public.has_module_action('Επιτροπές','create'));
create policy committees_update on public.committees for update to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Επιτροπές','edit')) with check (organization_id=public.current_organization_id() and public.has_module_action('Επιτροπές','edit'));
create policy committees_delete on public.committees for delete to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Επιτροπές','delete'));

drop policy if exists controlled_documents_org on public.controlled_documents;
create policy controlled_documents_select on public.controlled_documents for select to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Έγγραφα','view'));
create policy controlled_documents_insert on public.controlled_documents for insert to authenticated with check (organization_id=public.current_organization_id() and public.has_module_action('Έγγραφα','create'));
create policy controlled_documents_update on public.controlled_documents for update to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Έγγραφα','edit')) with check (organization_id=public.current_organization_id() and public.has_module_action('Έγγραφα','edit'));
create policy controlled_documents_delete on public.controlled_documents for delete to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Έγγραφα','delete'));

drop policy if exists prevention_records_org on public.prevention_records;
create policy prevention_records_select on public.prevention_records for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action(public.prevention_module_for(record_type),'view') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy prevention_records_insert on public.prevention_records for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action(public.prevention_module_for(record_type),'create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy prevention_records_update on public.prevention_records for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action(public.prevention_module_for(record_type),'edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action(public.prevention_module_for(record_type),'edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy prevention_records_delete on public.prevention_records for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action(public.prevention_module_for(record_type),'delete') and (department_id is null or public.can_access_clinical_department(department_id)));

-- Configuration write surfaces: readable where needed, writable only through the Management Center permission.
drop policy if exists form_templates_org on public.form_templates;
create policy form_templates_select on public.form_templates for select to authenticated using (organization_id=public.current_organization_id());
create policy form_templates_insert on public.form_templates for insert to authenticated with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','create'));
create policy form_templates_update on public.form_templates for update to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','edit')) with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','edit'));
create policy form_templates_delete on public.form_templates for delete to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','delete'));

drop policy if exists form_responses_org on public.form_responses;
create policy form_responses_select on public.form_responses for select to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Υγιεινή Χεριών','view'));
create policy form_responses_insert on public.form_responses for insert to authenticated with check (organization_id=public.current_organization_id() and public.has_module_action('Υγιεινή Χεριών','create'));
create policy form_responses_update on public.form_responses for update to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Υγιεινή Χεριών','edit')) with check (organization_id=public.current_organization_id() and public.has_module_action('Υγιεινή Χεριών','edit'));
create policy form_responses_delete on public.form_responses for delete to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Υγιεινή Χεριών','delete'));

drop policy if exists studio_configuration_org on public.studio_configuration;
create policy studio_configuration_select on public.studio_configuration for select to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','view'));
create policy studio_configuration_insert on public.studio_configuration for insert to authenticated with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','create'));
create policy studio_configuration_update on public.studio_configuration for update to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','edit')) with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','edit'));
create policy studio_configuration_delete on public.studio_configuration for delete to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','delete'));

drop policy if exists master_data_libraries_org on public.master_data_libraries;
create policy master_data_libraries_select on public.master_data_libraries for select to authenticated using (organization_id=public.current_organization_id());
create policy master_data_libraries_insert on public.master_data_libraries for insert to authenticated with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','create'));
create policy master_data_libraries_update on public.master_data_libraries for update to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','edit')) with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','edit'));
create policy master_data_libraries_delete on public.master_data_libraries for delete to authenticated using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Διαχείρισης','delete'));

-- Surveillance controls follow the Patient/Surveillance access level.
drop policy if exists surveillance_control_programs_scoped on public.surveillance_control_programs;
create policy surveillance_control_programs_select on public.surveillance_control_programs for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','view') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy surveillance_control_programs_insert on public.surveillance_control_programs for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy surveillance_control_programs_update on public.surveillance_control_programs for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy surveillance_control_programs_delete on public.surveillance_control_programs for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','delete') and (department_id is null or public.can_access_clinical_department(department_id)));

drop policy if exists surveillance_control_executions_scoped on public.surveillance_control_executions;
create policy surveillance_control_executions_select on public.surveillance_control_executions for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','view') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy surveillance_control_executions_insert on public.surveillance_control_executions for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','create') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy surveillance_control_executions_update on public.surveillance_control_executions for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)))
with check (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','edit') and (department_id is null or public.can_access_clinical_department(department_id)));
create policy surveillance_control_executions_delete on public.surveillance_control_executions for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Ασθενείς','delete') and (department_id is null or public.can_access_clinical_department(department_id)));


-- Indicator data uses the Quality permission and action-specific policies.
drop policy if exists indicator_settings_org on public.indicator_settings;
create policy indicator_settings_select on public.indicator_settings for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','view'));
create policy indicator_settings_insert on public.indicator_settings for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','create'));
create policy indicator_settings_update on public.indicator_settings for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit'))
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit'));
create policy indicator_settings_delete on public.indicator_settings for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','delete'));

drop policy if exists custom_indicators_org on public.custom_indicators;
create policy custom_indicators_select on public.custom_indicators for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','view'));
create policy custom_indicators_insert on public.custom_indicators for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','create'));
create policy custom_indicators_update on public.custom_indicators for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit'))
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit'));
create policy custom_indicators_delete on public.custom_indicators for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','delete'));

drop policy if exists indicator_source_records_org on public.indicator_source_records;
create policy indicator_source_records_select on public.indicator_source_records for select to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','view'));
create policy indicator_source_records_insert on public.indicator_source_records for insert to authenticated
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','create'));
create policy indicator_source_records_update on public.indicator_source_records for update to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit'))
with check (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','edit'));
create policy indicator_source_records_delete on public.indicator_source_records for delete to authenticated
using (organization_id=public.current_organization_id() and public.has_module_action('Κέντρο Ποιότητας','delete'));

-- Tighten attachment update/delete to the patient's department as well.
drop policy if exists patient_attachments_update_scoped on public.patient_attachments;
create policy patient_attachments_update_scoped on public.patient_attachments for update to authenticated
using (
  organization_id=public.current_organization_id()
  and public.has_module_action('Ασθενείς','edit')
  and exists(select 1 from public.patients p where p.id=patient_id and p.organization_id=public.current_organization_id() and (p.department_id is null or public.can_access_clinical_department(p.department_id)))
)
with check (
  organization_id=public.current_organization_id()
  and public.has_module_action('Ασθενείς','edit')
  and exists(select 1 from public.patients p where p.id=patient_id and p.organization_id=public.current_organization_id() and (p.department_id is null or public.can_access_clinical_department(p.department_id)))
);
drop policy if exists patient_attachments_delete_scoped on public.patient_attachments;
create policy patient_attachments_delete_scoped on public.patient_attachments for delete to authenticated
using (
  organization_id=public.current_organization_id()
  and public.has_module_action('Ασθενείς','delete')
  and exists(select 1 from public.patients p where p.id=patient_id and p.organization_id=public.current_organization_id() and (p.department_id is null or public.can_access_clinical_department(p.department_id)))
);

drop policy if exists patientattachments_select on storage.objects;
create policy patientattachments_select on storage.objects for select to authenticated
using (
  bucket_id='patientattachments'
  and (storage.foldername(name))[1]=public.current_organization_id()::text
  and public.has_module_action('Ασθενείς','view')
  and exists(
    select 1 from public.patients p
    where p.id=(storage.foldername(name))[2]
      and p.organization_id=public.current_organization_id()
      and (p.department_id is null or public.can_access_clinical_department(p.department_id))
  )
);
drop policy if exists patientattachments_insert on storage.objects;
create policy patientattachments_insert on storage.objects for insert to authenticated
with check (
  bucket_id='patientattachments'
  and (storage.foldername(name))[1]=public.current_organization_id()::text
  and public.has_module_action('Ασθενείς','create')
  and exists(
    select 1 from public.patients p
    where p.id=(storage.foldername(name))[2]
      and p.organization_id=public.current_organization_id()
      and (p.department_id is null or public.can_access_clinical_department(p.department_id))
  )
);
drop policy if exists patientattachments_delete on storage.objects;
create policy patientattachments_delete on storage.objects for delete to authenticated
using (
  bucket_id='patientattachments'
  and (storage.foldername(name))[1]=public.current_organization_id()::text
  and public.has_module_action('Ασθενείς','delete')
  and exists(
    select 1 from public.patients p
    where p.id=(storage.foldername(name))[2]
      and p.organization_id=public.current_organization_id()
      and (p.department_id is null or public.can_access_clinical_department(p.department_id))
  )
);

commit;

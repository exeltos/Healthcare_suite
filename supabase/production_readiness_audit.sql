-- Healthcare Suite rc.100 — Supabase Production Readiness Audit
-- READ ONLY. Run in Supabase SQL Editor after all migrations.

select 'organization_context' as check_name, public.current_organization_id()::text as result;

select 'required_tables' as check_name,
       x.table_name,
       case when t.table_name is null then 'MISSING' else 'OK' end as status
from (values
 ('organizations'),('user_profiles'),('user_department_access'),('departments'),('employees'),
 ('patients'),('surveillance_cases'),('patient_samples'),('infections'),('patient_isolations'),
 ('patient_attachments'),('laboratory_source_samples'),('prevention_records'),
 ('quality_incidents'),('quality_audits'),('quality_capa'),('quality_risks'),
 ('committees'),('controlled_documents'),('training_records'),
 ('form_templates'),('form_responses'),('master_data_libraries'),('studio_configuration'),
 ('custom_indicators'),('indicator_settings'),('indicator_source_records'),('indicator_definition_history'),
 ('surveillance_control_programs'),('surveillance_control_executions'),
 ('role_permission_configuration'),('system_audit_log'),('notification_escalation_policies'),
 ('data_retention_policies'),('security_auth_events'),('continuity_recovery_profiles'),
 ('continuity_recovery_tests'),('privacy_governance_profiles')
) x(table_name)
left join information_schema.tables t on t.table_schema='public' and t.table_name=x.table_name
order by status desc,x.table_name;

select 'required_functions' as check_name,
       x.function_name,
       case when p.proname is null then 'MISSING' else 'OK' end as status
from (values ('current_organization_id'),('get_my_context'),('get_my_module_access'),('activate_my_profile'),('is_app_admin')) x(function_name)
left join pg_proc p on p.proname=x.function_name
order by status desc,x.function_name;

select 'rls' as check_name,c.relname as table_name,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
and c.relname in ('patients','employees','surveillance_cases','patient_samples','quality_incidents','quality_capa','quality_risks','controlled_documents','training_records','committees','role_permission_configuration')
order by c.relname;

select 'storage_bucket' as check_name,id,public,file_size_limit
from storage.buckets
where id in ('patientattachments','operationalattachments');

select 'migration_count' as check_name,count(*)::text as result
from supabase_migrations.schema_migrations;

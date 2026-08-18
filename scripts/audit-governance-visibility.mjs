import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const checks=[
  ['Governance Center route',read('src/config/routes.js').includes('STUDIO_GOVERNANCE')],
  ['Governance Center page',read('src/pages/Studio/GovernancePage.jsx').includes('Immutable Audit Trail')],
  ['Audit trail backend',read('src/services/backend/governanceBackendService.js').includes("from('system_audit_log')")],
  ['Notification policy backend',read('src/services/backend/governanceBackendService.js').includes("from('notification_escalation_policies')")],
  ['Retention backend',read('src/services/backend/governanceBackendService.js').includes("from('data_retention_policies')")],
  ['Continuity backend',read('src/services/backend/governanceBackendService.js').includes("from('continuity_recovery_profiles')")],
  ['Recovery test backend',read('src/services/backend/governanceBackendService.js').includes("from('continuity_recovery_tests')")],
  ['Security event backend',read('src/services/backend/governanceBackendService.js').includes("from('security_auth_events')")],
  ['Privacy governance backend',read('src/services/backend/governanceBackendService.js').includes("from('privacy_governance_profiles')")],
  ['Competency gaps',read('src/services/backend/governanceBackendService.js').includes('loadCompetencyGaps')],
  ['Security event DB trigger',read('supabase/migrations/20260818_000028_governance_visibility_activation.sql').includes('user_profiles_security_event')],
  ['Department access event trigger',read('supabase/migrations/20260818_000028_governance_visibility_activation.sql').includes('user_department_access_security_event')],
  ['Indicator definition history',read('supabase/migrations/20260818_000028_governance_visibility_activation.sql').includes('indicator_definition_history')],
  ['Notification Center policy enforcement',read('src/components/layout/NotificationCenter.jsx').includes('governancePolicy')],
  ['Controlled document version history',read('src/pages/Organization/DocumentsPage.jsx').includes('Ιστορικό εκδόσεων')],
  ['Indicator governance version UI',read('src/pages/Quality/IndicatorsPage.jsx').includes('governanceVersion')],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`\nGovernance visibility audit: ${checks.length-failed}/${checks.length} passed`)
if(failed)process.exit(1)

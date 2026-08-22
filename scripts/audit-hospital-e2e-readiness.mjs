import fs from 'node:fs'

const workflow=fs.readFileSync('scripts/e2e-hospital-workflows.mjs','utf8')
const prevention=fs.readFileSync('src/services/backend/preventionBackendService.js','utf8')
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'))
const checks=[
  ['Prevention backend refactor import block is syntactically repaired',!prevention.includes("import {\nimport { mapPromoted")],
  ['Hospital workflow E2E uses normal auth login',workflow.includes('/auth/v1/token?grant_type=password')],
  ['Hospital workflow never uses service-role key',!workflow.includes('SUPABASE_SERVICE_ROLE_KEY')&&!workflow.includes('service_role_key')],
  ['Clinical workflow covers patient',workflow.includes("'patients'")],
  ['Clinical workflow covers surveillance',workflow.includes("'surveillance_cases'")],
  ['Clinical workflow covers laboratory sample and recheck',workflow.includes("'patient_samples'")&&workflow.includes('parent_sample_id')&&workflow.includes('root_sample_id')],
  ['Clinical workflow covers infection',workflow.includes("'infections'")],
  ['Clinical workflow covers isolation and closure',workflow.includes("'patient_isolations'")&&workflow.includes("workflow_phase:'closed'")],
  ['Staff workflow covers employees and occupational visits',workflow.includes("'employees'")&&workflow.includes("'employee_occupational_visits'")],
  ['WHO workflow covers session and observations',workflow.includes("'hand_hygiene_sessions'")&&workflow.includes("'hand_hygiene_observations'")],
  ['Quality workflow covers incident to CAPA effectiveness',workflow.includes("'quality_incidents'")&&workflow.includes("'quality_capa'")&&workflow.includes("effectiveness_status:'Αποτελεσματική'")],
  ['Committee workflow covers relational attendance',workflow.includes("'committee_members'")&&workflow.includes("'committee_meetings'")&&workflow.includes("'committee_meeting_attendees'")],
  ['Committee workflow tests outsider rejection',workflow.includes('outsider attendance is rejected')],
  ['Documents workflow covers controlled documents and duplicate code',workflow.includes("'controlled_documents'")&&workflow.includes('duplicate document code')],
  ['Tenant isolation includes employee quality and document records',workflow.includes('cannot read first hospital employee')&&workflow.includes('cannot read first hospital quality incident')&&workflow.includes('cannot read first hospital controlled document')],
  ['Cleanup is deterministic and reverse-order',workflow.includes('[...cleanup].reverse()')],
  ['Strict hospital release requires second tenant',workflow.includes("strict")&&workflow.includes('two different organizations')],
  ['Package exposes hospital workflow command',pkg.scripts?.['e2e:hospital-workflows']==='node scripts/e2e-hospital-workflows.mjs'],
  ['Package exposes strict hospital release command',pkg.scripts?.['e2e:hospital-release']==='node scripts/e2e-hospital-workflows.mjs --strict'],
  ['Release version is a current release candidate',/^0\.12\.0-rc\.\d+$/.test(pkg.version)],
]
let failed=0
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++}
console.log(`Hospital E2E readiness audit: ${checks.length-failed}/${checks.length} passed.`)
if(failed)process.exit(1)

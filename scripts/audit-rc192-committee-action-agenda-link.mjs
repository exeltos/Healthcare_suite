import fs from 'node:fs'
const ui=fs.readFileSync('src/pages/Organization/CommitteesPage.jsx','utf8')
const backend=fs.readFileSync('src/services/backend/organizationBackendService.js','utf8')
const checks=[
 ['new action has agendaItemId',ui.includes("agendaItemId:''")],
 ['action UI has related topic selector',ui.includes("aria-label={L('Σχετικό θέμα','Related topic')}")],
 ['UI allows independent decision',ui.includes("Γενική / ανεξάρτητη απόφαση")],
 ['backend persists selected agenda relation',backend.includes("String(action.agendaItemId||'')")&&backend.includes("?.relationalId||null")],
 ['hydration restores action agendaItemId',backend.includes("agendaItemId:d.agenda_item_id||''")],
 ['linked follow-up actions remain visible',backend.includes("x.responsible_employee_id||x.responsible_name||x.due_date")]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const passed=checks.filter(([,ok])=>ok).length
console.log(`Committee action agenda link rc.192: ${passed}/${checks.length} passed`)
process.exit(passed===checks.length?0:1)

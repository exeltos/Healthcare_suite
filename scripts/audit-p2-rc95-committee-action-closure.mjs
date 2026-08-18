import fs from'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const c=read('src/pages/Organization/CommitteesPage.jsx')
const n=read('src/components/layout/NotificationCenter.jsx')
const h=read('src/components/help/helpContentAdmin.js')
const checks=[
 ['Finalized action has operational update handler',c.includes('async function updateFinalizedAction')],
 ['Action status persists through committee backend',c.includes('await saveOperationalCommittee(saved)')],
 ['Completion records timestamp',c.includes("next.completedAt=now")],
 ['Completion records actor',c.includes("next.completedBy=")],
 ['Reopening clears completion evidence',c.includes("next.completedAt=''")&&c.includes("next.completedBy=''")],
 ['Finalized meetings expose action status control',c.includes('org-finalized-actions')&&c.includes('updateFinalizedAction(mt.id,action.id')],
 ['Alert source excludes completed actions',n.includes("action.status!=='Ολοκληρωμένη'")],
 ['Help explains finalized-minutes/action-status separation',h.includes('οριστικοποιημένες συνεδριάσεις παραμένουν ιστορικά σταθερές')&&h.includes('Finalized meeting records remain historically fixed')],
]
let f=0;for(const[x,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${x}`);if(!ok)f++}
console.log(`\nP2 rc.95 committee action closure audit: ${checks.length-f}/${checks.length} passed`);if(f)process.exit(1)

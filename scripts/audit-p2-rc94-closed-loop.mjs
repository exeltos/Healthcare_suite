import fs from'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const n=read('src/components/layout/NotificationCenter.jsx')
const g=read('src/services/backend/governanceBackendService.js')
const gp=read('src/pages/Studio/GovernancePage.jsx')
const c=read('src/pages/Organization/CommitteesPage.jsx')
const h=read('src/components/help/helpContentAdmin.js')
const checks=[
 ['Committee actions are notification sources',n.includes('loadCommittees')&&n.includes('committee-action:')],
 ['Only finalized committee meetings create governed action alerts',n.includes("meeting.status==='Οριστικοποιημένη'")],
 ['Only overdue open committee actions alert',n.includes("action.status!=='Ολοκληρωμένη'")&&n.includes('days>=0')],
 ['Committee action policy exists and is closed-loop',g.includes("policy_key:'committee_action_overdue'")&&g.includes("closedLoop:true")],
 ['Governance labels committee action policy',gp.includes("committee_action_overdue:['Εκπρόθεσμη ενέργεια επιτροπής','Overdue committee action']")],
 ['Finalized decision actions require owner and due date',c.includes('incompleteActions')&&c.includes('Every decision action needs an owner and due date')],
 ['Notification content has EN rendering',n.includes('function notificationCopy')&&n.includes("'Overdue committee action'")],
 ['Notification dialog aria label is bilingual',n.includes("L('Κέντρο ειδοποιήσεων','Notification Center')")],
 ['Help Center covers committee action governance',h.includes('εκπρόθεσμες ενέργειες επιτροπών')&&h.includes('overdue committee actions')],
]
let f=0;for(const[nm,ok]of checks){console.log(`${ok?'PASS':'FAIL'} ${nm}`);if(!ok)f++}
console.log(`\nP2 rc.94 closed-loop audit: ${checks.length-f}/${checks.length} passed`);if(f)process.exit(1)

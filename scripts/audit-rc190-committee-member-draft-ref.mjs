import fs from 'node:fs'
const ui=fs.readFileSync('src/pages/Organization/CommitteesPage.jsx','utf8')
const checks=[
 ['uses member edits ref',ui.includes('memberEditsRef=useRef(new Map())')],
 ['captures edits synchronously',ui.includes("memberEditsRef.current.set(key,{...previous,...patch})")],
 ['save merges pending edits',ui.includes('mergePendingMemberEdits')],
 ['saved members use merged edits',ui.includes('members:membersForSave')],
 ['history uses merged edits',ui.includes('after:membersForSave.map')],
 ['role exclusivity no undefined id reference',!ui.includes("x.id!==id&&x.role==='Πρόεδρος'")&&!ui.includes("x.id!==id&&x.role==='Γραμματέας'")]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(([,ok])=>ok).length
console.log(`Committee member draft ref rc.190: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)

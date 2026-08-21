import fs from 'node:fs'
const b=fs.readFileSync('src/services/backend/organizationBackendService.js','utf8')
const checks=[
 ['captures source agenda id before UUID mutation',b.includes("const sourceAgendaId=String(item.id||item.relationalId||'')")],
 ['creates agenda relation map',b.includes('const agendaRelationMap=new Map()')],
 ['maps original agenda id to relational UUID',b.includes('agendaRelationMap.set(sourceAgendaId,agendaId)')],
 ['maps relational UUID to itself',b.includes("agendaRelationMap.set(String(agendaId),agendaId)")],
 ['action uses stable relation map',b.includes("agenda_item_id:agendaRelationMap.get(String(action.agendaItemId||''))||null")],
 ['old post-mutation find removed',!b.includes("find(item=>String(item.id||item.relationalId||'')===String(action.agendaItemId||''))")]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(([,ok])=>ok).length
console.log(`Committee agenda ID lifecycle rc.193: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)

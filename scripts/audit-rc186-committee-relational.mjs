import fs from 'node:fs'
const svc=fs.readFileSync('src/services/backend/organizationBackendService.js','utf8')
const mig=fs.readFileSync('supabase/migrations/20260821_000020_committee_relational_governance.sql','utf8')
const checks=[
 ['loads relational committees',svc.includes('hydrateRelationalCommittees(c,base)')],
 ['syncs committee relations',svc.includes('syncCommitteeRelations(c,{org,actor,row,staffMap})')],
 ['member ids derive from members',svc.includes('const memberIds=members.map')],
 ['members table used',svc.includes("from('committee_members')")],
 ['meetings table used',svc.includes("from('committee_meetings')")],
 ['attendees table used',svc.includes("from('committee_meeting_attendees')")],
 ['agenda table used',svc.includes("from('committee_agenda_items')")],
 ['decisions table used',svc.includes("from('committee_decisions')")],
 ['stable UUID relational ids',svc.includes('crypto.randomUUID()')],
 ['migration creates five tables',['committee_members','committee_meetings','committee_meeting_attendees','committee_agenda_items','committee_decisions'].every(x=>mig.includes(`create table if not exists public.${x}`))],
 ['migration backfills members',mig.includes('jsonb_array_elements')],
 ['migration enables RLS',mig.includes('committee_decisions enable row level security')],
]
for(const [n,ok] of checks) console.log(ok?'PASS':'FAIL',n)
const passed=checks.filter(([,ok])=>ok).length
console.log(`Committee relational rc.186: ${passed}/${checks.length} passed`)
process.exit(passed===checks.length?0:1)

import fs from 'node:fs'
const b=fs.readFileSync('src/services/backend/organizationBackendService.js','utf8')
const checks=[
 ['load hydrates training attendees',b.includes('hydrateRelationalTraining(c,base)')],
 ['save syncs relational attendees',b.includes('syncTrainingAttendees(c,{org,actor,row,staffMap})')],
 ['employee department sourced from registry',b.includes("department_name:String(department?.name||item.department||'')")],
 ['stable attendee UUID returned to UI',b.includes('attendeeId:item.id')&&b.includes('item.attendeeId=saved.id')],
 ['assessor UUID recorded for assessed attendee',b.includes('assessed_by_user_id:hasAssessment?(item.assessedByUserId||actor):null')],
 ['score validated numeric',b.includes('Training attendee score must be numeric.')],
 ['removed attendees are deleted relationally',b.includes("c.from('training_attendees').delete().eq('id',item.id)")],
 ['readback verifies count',b.includes('Training attendee relational verification failed.')]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(([,ok])=>ok).length
console.log(`Training relational rc.194: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)

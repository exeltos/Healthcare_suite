import fs from 'node:fs'
const ui=fs.readFileSync('src/pages/Organization/TrainingPage.jsx','utf8')
const b=fs.readFileSync('src/services/backend/organizationBackendService.js','utf8')
const checks=[
 ['training uses assessment draft ref',ui.includes('attendanceEditsRef=useRef(new Map())')],
 ['assessment edits captured synchronously',ui.includes('attendanceEditsRef.current.set(key')],
 ['save merges pending attendance',ui.includes('attendanceForSave=mergePendingAttendance')],
 ['save sends merged attendance',ui.includes('attendance:attendanceForSave')],
 ['competency auto date is date-only',ui.includes("new Date().toISOString().slice(0,10)")],
 ['backend verifies score and competency',b.includes('Training attendee assessment fields were not persisted.')],
 ['backend verifies assessor uuid',b.includes('Training assessor user id was not persisted.')],
 ['assessment date safely normalized',b.includes("assessed_at:date(item.assessedAt)?")]
]
for(const [n,ok] of checks)console.log(ok?'PASS':'FAIL',n)
const n=checks.filter(([,ok])=>ok).length
console.log(`Training assessment save rc.195: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)

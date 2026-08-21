import fs from 'node:fs'
const s=fs.readFileSync('src/services/backend/preventionBackendService.js','utf8')
const checks=[
 ['staff vaccinations load employee_vaccinations',s.includes("from('employee_vaccinations')")],
 ['load joins employee and department',s.includes("employee:employees(id,employee_code,first_name,last_name,professional_category,status,department_id,department:departments(id,name))")],
 ['save writes employee_vaccinations',s.includes("write.insert(payload)")&&s.includes("write.update(payload)")],
 ['employee link verified',s.includes('Supabase vaccination employee verification failed.')],
 ['vaccine/date/dose verified',s.includes('Supabase vaccination vaccine verification failed.')&&s.includes('Supabase vaccination date verification failed.')&&s.includes('Supabase vaccination dose verification failed.')],
 ['lot and validity verified',s.includes('Supabase vaccination lot verification failed.')&&s.includes('Supabase vaccination validity verification failed.')],
 ['delete targets employee_vaccinations',s.includes("delete().eq('organization_id',org).eq('id',String(id)).select('id')")],
 ['UI model mapping preserved',s.includes('validUntil:r.next_due_date')&&s.includes('lot:r.lot_number')],
 ['legacy prevention records remain generic for other types',s.includes("from('prevention_records').upsert(payload")]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`Employee vaccinations rc.198: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)

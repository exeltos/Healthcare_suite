import fs from 'node:fs'
const b=fs.readFileSync('src/services/backend/preventionBackendService.js','utf8')
const p=fs.readFileSync('src/pages/Prevention/WasteMeasurementsPage.jsx','utf8')
const checks=[
 ['dedicated load exported',b.includes('export async function loadWasteMeasurementsRelational')],
 ['dedicated save exported',b.includes('export async function saveWasteMeasurementRelational')],
 ['dedicated delete exported',b.includes('export async function deleteWasteMeasurementRelational')],
 ['page imports dedicated functions',p.includes('saveWasteMeasurementRelational')],
 ['page no generic waste save',!p.includes("savePreventionRecord('waste'")],
 ['page no generic waste delete',!p.includes("deletePreventionRecord('waste'")],
 ['page loads dedicated relational',p.includes('useServiceCollection(loadWasteMeasurementsRelational')],
 ['read-back verification retained',b.includes('Supabase waste write could not be verified.')]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`Waste direct relational rc.206: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)

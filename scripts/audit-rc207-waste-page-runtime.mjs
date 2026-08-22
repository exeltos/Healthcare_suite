import fs from 'node:fs'
const p=fs.readFileSync('src/pages/Prevention/WasteMeasurementsPage.jsx','utf8')
const b=fs.readFileSync('src/services/backend/preventionBackendService.js','utf8')
const checks=[
 ['collection hook is synchronous',p.includes('useServiceCollection(loadWasteMeasurements, WASTE_MEASUREMENTS_EVENT)')],
 ['async relational loader not passed to hook',!p.includes('useServiceCollection(loadWasteMeasurementsRelational')],
 ['dedicated relational save retained',p.includes('saveWasteMeasurementRelational(')],
 ['dedicated relational delete retained',p.includes('deleteWasteMeasurementRelational(')],
 ['generic waste save absent',!p.includes("savePreventionRecord('waste'")],
 ['generic waste delete absent',!p.includes("deletePreventionRecord('waste'")],
 ['backend dedicated save retained',b.includes('export async function saveWasteMeasurementRelational')],
 ['backend read-back verification retained',b.includes('Supabase waste write could not be verified.')]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`Waste page runtime rc.207: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)

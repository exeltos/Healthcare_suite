import fs from 'node:fs'
const p=fs.readFileSync('src/pages/Prevention/WasteMeasurementsPage.jsx','utf8')
const checks=[
 ['no undefined relational loader',!p.includes('loadWasteMeasurementsRelational')],
 ['sync hook loader',p.includes('useServiceCollection(loadWasteMeasurements, WASTE_MEASUREMENTS_EVENT)')],
 ['save remains dedicated relational',p.includes('saveWasteMeasurementRelational(')],
 ['delete remains dedicated relational',p.includes('deleteWasteMeasurementRelational(')],
 ['refresh after save uses sync loader',p.includes('setRecords(await loadWasteMeasurements())') || p.includes('setRecords(loadWasteMeasurements())')],
 ['backend import excludes relational loader',!p.includes('import { deleteWasteMeasurementRelational, loadWasteMeasurements')]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`Waste loader cleanup rc.208: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)

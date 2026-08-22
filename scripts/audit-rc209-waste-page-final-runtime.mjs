import fs from 'node:fs'
const p=fs.readFileSync('src/pages/Prevention/WasteMeasurementsPage.jsx','utf8')
const checks=[
 ['no undefined relational loader',!p.includes('loadWasteMeasurementsRelational')],
 ['no promise use of sync loader',!p.includes('loadWasteMeasurements().then')],
 ['no await on sync loader',!p.includes('await loadWasteMeasurements()')],
 ['sync service collection retained',p.includes('useServiceCollection(loadWasteMeasurements, WASTE_MEASUREMENTS_EVENT)')],
 ['dedicated relational save retained',p.includes('saveWasteMeasurementRelational(')],
 ['dedicated relational delete retained',p.includes('deleteWasteMeasurementRelational(')],
 ['post-save local refresh is sync',p.includes('setRecords(loadWasteMeasurements())')],
 ['generic waste save absent',!p.includes("savePreventionRecord('waste'")]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`Waste final runtime rc.209: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)

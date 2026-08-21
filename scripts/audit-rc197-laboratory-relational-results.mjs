import fs from 'node:fs'
const p=fs.readFileSync('src/services/backend/clinicalDirectoryService.js','utf8')
const s=fs.readFileSync('src/services/backend/clinicalSupportBackendService.js','utf8')
const checks=[
 ['patient load hydrates relational organisms',p.includes('hydratePatientSampleLaboratoryResults(client,base)')],
 ['patient save syncs organisms/antibiogram',p.includes('syncPatientSampleLaboratoryResults(client,{')],
 ['source load hydrates relational organisms',s.includes('hydrateSourceSampleLaboratoryResults(c,base)')],
 ['source save syncs organisms/antibiogram',s.includes('syncSourceSampleLaboratoryResults(c,{')],
 ['patient organisms use patient FK',p.includes('patient_sample_id:sampleId')],
 ['source organisms use source FK',s.includes('source_sample_id:sampleId')],
 ['antibiogram linked to primary organism',p.includes('organism_result_id:primarySaved.id')&&s.includes('organism_result_id:primarySaved.id')],
 ['stale organism rows removed',p.includes("from('laboratory_sample_organisms').delete()")&&s.includes("from('laboratory_sample_organisms').delete()")],
 ['stale antibiogram rows removed',p.includes("from('laboratory_antibiogram_results').delete()")&&s.includes("from('laboratory_antibiogram_results').delete()")]
]
for(const [name,ok] of checks)console.log(ok?'PASS':'FAIL',name)
const n=checks.filter(([,ok])=>ok).length
console.log(`Laboratory relational results rc.197: ${n}/${checks.length} passed`)
process.exit(n===checks.length?0:1)

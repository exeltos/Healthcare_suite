import fs from 'node:fs'
const r=p=>fs.readFileSync(p,'utf8')
const runtime=r('src/core/runtime/runtimeConfig.js')
const employees=r('src/services/employeesService.js')
const samples=r('src/services/patientSamplesService.js')
const diseases=r('src/services/notifiableDiseasesService.js')
const quality=r('src/services/qualityService.js')
const controls=r('src/services/surveillanceControlsService.js')
const organization=r('src/services/organizationService.js')
const patients=r('src/services/patientService.js')
const patientCases=r('src/services/patientCasesService.js')
const auth=r('src/services/auth/authService.js')
const boundary=r('src/data/productionDataBoundary.js')
const failures=[]
if(!runtime.includes('HAS_SUPABASE_RUNTIME')||!runtime.includes("RAW_MODE === 'production' || HAS_SUPABASE_RUNTIME"))failures.push('Supabase runtime does not force Production mode.')
for(const [name,text] of [
  ['employees',employees],['patient samples',samples],['notifiable diseases',diseases],
  ['quality',quality],['surveillance controls',controls],['organization',organization],
]){
  if(/\bDEFAULT_EMPLOYEES\b|\bseedSamples\b|\bDEFAULT_INCIDENTS\b|\bDEFAULT_CAPA\b|\bseedTraining\b|\bseedCommittees\b|\bseedDocuments\b|\bseedPrograms\b/.test(text))
    failures.push(`Normal ${name} service still contains operational demo seed records.`)
}
if(!/!IS_PRODUCTION && \(config\.sourceMode/.test(patients))failures.push('Production can add mock patients.')
if(!/if \(IS_PRODUCTION\) return \[\]/.test(patientCases))failures.push('Production can expose mock patient cases.')
if((auth.match(/clearProductionLocalOperationalCache\(\)/g)||[]).length<2)failures.push('Production auth/session restore does not clear stale operational cache.')
for(const key of ['employees','staff','employeesList','employee-library','limoxisStaffSamples','limoxisEnvironmentalSamples','limoxisWaterRecords','limoxisTraining','limoxisCommittees','limoxisDocuments']){
  if(!boundary.includes(`removeStoredValue('${key}')`)) failures.push(`Legacy production cache key is not purged: ${key}`)
}
if(failures.length){console.error('Production clean-data audit failed:');failures.forEach(x=>console.error('- '+x));process.exitCode=1}
else console.log('Production clean-data audit OK: Supabase forces Production mode; normal services contain no operational seeds; legacy browser caches are purged.')

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
if(!/IS_PRODUCTION \? \[\] : DEFAULT_EMPLOYEES/.test(employees))failures.push('Production can seed default employees.')
if(!/IS_PRODUCTION \? \[\] : seedSamples/.test(samples))failures.push('Production can seed patient samples.')
if(!/IS_PRODUCTION\?\[\]:seed/.test(diseases))failures.push('Production can seed notifiable-disease records.')
if(!/IS_PRODUCTION\?\[\]:DEFAULT_INCIDENTS/.test(quality)||!/IS_PRODUCTION\?\[\]:DEFAULT_CAPA/.test(quality))failures.push('Production can seed Quality records.')
if(!/seed: IS_PRODUCTION \? \[\] : seedPrograms/.test(controls))failures.push('Production can seed surveillance-control programs.')
if((organization.match(/IS_PRODUCTION\?\[\]:seed(?:Training|Committees|Documents)/g)||[]).length<3)failures.push('Production can seed organization records.')
if(!/!IS_PRODUCTION && \(config\.sourceMode/.test(patients))failures.push('Production can add mock patients.')
if(!/if \(IS_PRODUCTION\) return \[\]/.test(patientCases))failures.push('Production can expose mock patient cases.')
if((auth.match(/clearProductionLocalOperationalCache\(\)/g)||[]).length<2)failures.push('Production auth/session restore does not clear stale operational cache.')
for(const key of ['employees','staff','employeesList','employee-library','limoxisStaffSamples','limoxisEnvironmentalSamples','limoxisWaterRecords','limoxisTraining','limoxisCommittees','limoxisDocuments']){
  if(!boundary.includes(`removeStoredValue('${key}')`)) failures.push(`Legacy production cache key is not purged: ${key}`)
}
if(failures.length){console.error('Production clean-data audit failed:');failures.forEach(x=>console.error('- '+x));process.exitCode=1}
else console.log('Production clean-data audit OK: Supabase forces Production mode; operational seeds are Demo-only; legacy browser caches are purged.')

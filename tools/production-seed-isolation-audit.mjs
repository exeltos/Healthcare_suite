import fs from 'node:fs'
import path from 'node:path'

const failures=[]
const main=fs.readFileSync('src/main.jsx','utf8')
if(!main.includes('if (IS_PRODUCTION) clearProductionLocalOperationalCache()'))
  failures.push('Production cache is not purged before React mounts.')

const forbidden=[
  'EMP-001',
  'PS-1001',
  "id:'INC-001'",
  "id:'cm-1'",
  "id:'tr-1'",
  "id:'dc-1'",
]
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name)
    if(entry.isDirectory())walk(p)
    else if(/\.(js|jsx)$/.test(entry.name) && !p.replace(/\\/g,'/').endsWith('src/data/demoDataGenerator.js')){
      const text=fs.readFileSync(p,'utf8')
      for(const token of forbidden) if(text.includes(token)) failures.push(`${p}: operational sample token remains outside Demo generator: ${token}`)
    }
  }
}
walk('src')

for(const file of [
  'src/services/employeesService.js',
  'src/services/patientSamplesService.js',
  'src/services/qualityService.js',
  'src/services/notifiableDiseasesService.js',
  'src/services/surveillanceControlsService.js',
  'src/services/organizationService.js',
]){
  const text=fs.readFileSync(file,'utf8')
  if(/\bDEFAULT_EMPLOYEES\b|\bseedSamples\b|\bDEFAULT_INCIDENTS\b|\bDEFAULT_CAPA\b|\bseedTraining\b|\bseedCommittees\b|\bseedDocuments\b|\bseedPrograms\b/.test(text))
    failures.push(`${file}: normal operational service still owns demo seed data.`)
}

const demo=fs.readFileSync('src/data/demoDataGenerator.js','utf8')
for(const required of ['DEMO-INC-001','DEMO-CM-1','DEMO-TR-1','DEMO-DOC-1'])
  if(!demo.includes(required)) failures.push(`Demo generator is missing ${required}.`)

if(failures.length){
  console.error('Production seed isolation audit failed:')
  failures.forEach(x=>console.error('- '+x))
  process.exitCode=1
}else{
  console.log('Production seed isolation audit OK: Production purges before mount; operational sample records exist only in the Demo generator.')
}

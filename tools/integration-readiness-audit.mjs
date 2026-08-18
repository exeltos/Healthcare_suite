import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('src')
const UI_DIRS = [path.join(ROOT, 'pages'), path.join(ROOT, 'components')]
const clinicalMockImports = [
  '/data/patientsMock',
  '/data/patientCasesMock',
]

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const uiFiles = UI_DIRS.flatMap(walk).filter((file) => /\.(js|jsx)$/.test(file))
const violations = []

for (const file of uiFiles) {
  const text = fs.readFileSync(file, 'utf8').replaceAll('\\', '/')
  for (const forbidden of clinicalMockImports) {
    if (text.includes(forbidden)) {
      violations.push(`${path.relative(process.cwd(), file)} imports clinical mock source ${forbidden}`)
    }
  }
  if (/from\s+['\"][^'\"]*repositories\//.test(text)) {
    violations.push(`${path.relative(process.cwd(), file)} imports a repository directly`)
  }
}

const requiredFiles = [
  'src/api/limoxisApi.js',
  'src/api/adapters/localApiAdapter.js',
  'src/domain/canonical/clinicalModel.js',
  'src/integrations/contracts/hospitalIntegration.js',
  'src/integrations/reporting/centralReporting.js',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(path.resolve(file))) violations.push(`Missing integration-readiness module: ${file}`)
}

if (violations.length) {
  console.error(`Integration readiness audit failed: ${violations.length} violation(s).`)
  violations.forEach((item) => console.error(` - ${item}`))
  process.exit(1)
}

console.log(`Integration readiness OK: ${uiFiles.length} UI modules checked, no direct clinical mock/repository dependencies.`)

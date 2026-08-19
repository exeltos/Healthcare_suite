import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src')
const files = []
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
  const target = path.join(dir, entry.name)
  if (entry.isDirectory()) walk(target)
  else if (/\.(js|jsx|css)$/.test(entry.name)) files.push(target)
})
walk(root)

const counters = { pages: 0, legacyCommonImports: 0, legacyUiImports: 0, coreImports: 0, rawButtons: 0, cssFiles: 0 }
const findings = []
for (const file of files) {
  const rel = path.relative(process.cwd(), file)
  const text = fs.readFileSync(file, 'utf8')
  if (rel.startsWith(`src${path.sep}pages${path.sep}`) && /\.(js|jsx)$/.test(file)) counters.pages++
  if (file.endsWith('.css')) counters.cssFiles++
  const common = (text.match(/components\/common/g) || []).length
  const ui = (text.match(/components\/ui/g) || []).length
  const core = (text.match(/components\/core/g) || []).length
  const buttons = (text.match(/<button\b/g) || []).length
  counters.legacyCommonImports += common
  counters.legacyUiImports += ui
  counters.coreImports += core
  counters.rawButtons += buttons
  if (ui) findings.push(`${rel}: legacy components/ui import`)
}
console.log(JSON.stringify(counters, null, 2))
if (findings.length) {
  console.error('\nBlocking findings:')
  findings.forEach((item) => console.error(`- ${item}`))
  process.exit(1)
}
console.log('\nUI audit passed: no direct components/ui imports remain.')

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('src')
const sourceFiles = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(jsx?|css)$/.test(entry.name)) sourceFiles.push(full)
  }
}
walk(ROOT)

const failures = []
let rawButtons = 0
let hardcodedColors = 0
for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(process.cwd(), file).replaceAll('\\', '/')
  if (!rel.includes('/core/feedback/') && /window\.(alert|confirm|prompt)\s*\(|(?<![\w.])(alert|confirm|prompt)\s*\(/.test(text)) {
    failures.push(`${rel}: direct browser dialog call; use core/feedback boundary`)
  }
  if (/\.jsx$/.test(file)) rawButtons += (text.match(/<button\b/g) || []).length
  if (/\.css$/.test(file)) hardcodedColors += (text.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length
}

// These are regression budgets, not targets. They prevent consistency debt from growing
// while legacy screens are migrated safely in controlled passes.
if (rawButtons > 129) failures.push(`Raw <button> budget exceeded: ${rawButtons} > 129`)
if (hardcodedColors > 923) failures.push(`Hard-coded CSS color budget exceeded: ${hardcodedColors} > 923`)

if (failures.length) {
  console.error('Consistency audit failed:')
  failures.forEach((item) => console.error(`- ${item}`))
  process.exit(1)
}
console.log(`Consistency audit passed. Raw buttons: ${rawButtons}; hard-coded colors: ${hardcodedColors}; direct browser dialogs: 0.`)

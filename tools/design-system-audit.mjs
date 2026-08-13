import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src')
const cssFiles = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.isFile() && entry.name.endsWith('.css')) cssFiles.push(full)
  }
}
walk(root)

const violations = []
for (const file of cssFiles) {
  const text = fs.readFileSync(file, 'utf8')
  if (/font-family\s*:\s*[^;]*\bInter\b/i.test(text)) {
    violations.push(`${path.relative(process.cwd(), file)}: declares Inter without a bundled font asset`)
  }
  for (const match of text.matchAll(/font-weight\s*:\s*(750|850)\b/g)) {
    violations.push(`${path.relative(process.cwd(), file)}: non-standard font-weight ${match[1]}`)
  }
}

if (violations.length) {
  console.error('Design-system audit failed:')
  for (const item of violations) console.error(`- ${item}`)
  process.exit(1)
}

console.log(`Design-system audit OK: ${cssFiles.length} CSS files use the production-safe font stack and standardized weights.`)

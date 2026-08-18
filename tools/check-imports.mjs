import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src')
const staticImportPattern = /(?:import\s+(?:[^'\"]+?\s+from\s+)?|export\s+[^'\"]*?from\s+)[\"']([^\"']+)[\"']/g
const dynamicImportPattern = /import\s*\(\s*[\"']([^\"']+)[\"']\s*\)/g
const extensions = ['.js', '.jsx', '.css']

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null
  const base = path.resolve(path.dirname(fromFile), specifier)
  const candidates = [base, ...extensions.map((ext) => `${base}${ext}`), path.join(base, 'index.js'), path.join(base, 'index.jsx')]
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null
}

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(target, output)
    else if (extensions.includes(path.extname(entry.name))) output.push(path.resolve(target))
  }
  return output
}

const allFiles = walk(root)
const reachable = new Set()
const missing = []
const stack = [path.join(root, 'main.jsx')]

while (stack.length) {
  const file = path.resolve(stack.pop())
  if (reachable.has(file) || !fs.existsSync(file)) continue
  reachable.add(file)
  if (!['.js', '.jsx'].includes(path.extname(file))) continue
  const text = fs.readFileSync(file, 'utf8')
  const matches = [
    ...text.matchAll(staticImportPattern),
    ...text.matchAll(dynamicImportPattern),
  ]
  for (const match of matches) {
    const specifier = match[1]
    const target = resolveImport(file, specifier)
    if (specifier.startsWith('.') && !target) missing.push(`${path.relative(process.cwd(), file)} -> ${specifier}`)
    if (target && !reachable.has(target)) stack.push(target)
  }
}

const unreachable = allFiles.filter((file) => !reachable.has(file))
if (missing.length || unreachable.length) {
  if (missing.length) console.error(`Missing imports (${missing.length}):\n${missing.map((item) => `- ${item}`).join('\n')}`)
  if (unreachable.length) console.error(`Unreachable source files (${unreachable.length}):\n${unreachable.map((file) => `- ${path.relative(process.cwd(), file)}`).join('\n')}`)
  process.exit(1)
}
console.log(`Import graph OK: ${reachable.size} reachable source files, 0 unreachable, 0 missing imports`)

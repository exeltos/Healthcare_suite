import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('src')
const sourceExtensions = new Set(['.js', '.jsx', '.css'])
const moduleExtensions = new Set(['.js', '.jsx'])
const importPattern = /(?:import\s+(?:[^'\"]+?\s+from\s+)?|export\s+[^'\"]*?from\s+)[\"']([^\"']+)[\"']/g

function walk(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(target, output)
    else if (sourceExtensions.has(path.extname(entry.name))) output.push(path.resolve(target))
  }
  return output
}

function resolveImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null
  const base = path.resolve(path.dirname(fromFile), specifier)
  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.css`, path.join(base, 'index.js'), path.join(base, 'index.jsx')]
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) || null
}

const files = walk(root)
const modules = files.filter((file) => moduleExtensions.has(path.extname(file)))
const graph = new Map(modules.map((file) => [file, []]))
const findings = []

for (const file of modules) {
  const rel = path.relative(process.cwd(), file)
  const text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(importPattern)) {
    const target = resolveImport(file, match[1])
    if (target && graph.has(target)) graph.get(file).push(target)
  }

  if (!rel.startsWith(`src${path.sep}core${path.sep}storage${path.sep}`) && /\blocalStorage\b/.test(text)) {
    findings.push(`${rel}: direct localStorage access outside core/storage`)
  }
  if (/(?:emitAppEvent|listenAppEvent|subscribeAppEvents)\s*\(\s*['\"]limoxis:[^'\"]+['\"]/.test(text)) {
    findings.push(`${rel}: hard-coded application event name outside APP_EVENTS`)
  }
  if (/\bnew\s+CustomEvent\b|\.dispatchEvent\s*\(/.test(text)) {
    findings.push(`${rel}: legacy DOM application event usage`)
  }
  if (['core', 'repositories', 'services'].includes(rel.split(path.sep)[1]) && /\b(?:alert|confirm|prompt)\s*\(/.test(text)) {
    findings.push(`${rel}: browser dialog call inside non-UI layer`)
  }
  for (const match of text.matchAll(/<button\b([^>]*)>/gs)) {
    if (!/\btype\s*=/.test(match[1])) findings.push(`${rel}: button without explicit type`)
  }
}

// Dependency direction: low-level layers must never depend on UI or services above them.
for (const [file, targets] of graph) {
  const sourceTop = path.relative(root, file).split(path.sep)[0]
  for (const target of targets) {
    const targetTop = path.relative(root, target).split(path.sep)[0]
    if (sourceTop === 'core' && ['repositories', 'services', 'components', 'pages', 'data'].includes(targetTop)) {
      findings.push(`${path.relative(process.cwd(), file)}: core depends upward on ${path.relative(process.cwd(), target)}`)
    }
    if (sourceTop === 'repositories' && ['services', 'components', 'pages'].includes(targetTop)) {
      findings.push(`${path.relative(process.cwd(), file)}: repository depends upward on ${path.relative(process.cwd(), target)}`)
    }
    if (sourceTop === 'services' && ['components', 'pages'].includes(targetTop)) {
      findings.push(`${path.relative(process.cwd(), file)}: service depends on UI ${path.relative(process.cwd(), target)}`)
    }
  }
}

// Cycle detection.
const state = new Map()
const stack = []
const cycleKeys = new Set()
function visit(node) {
  state.set(node, 1)
  stack.push(node)
  for (const next of graph.get(node) || []) {
    if (!state.get(next)) visit(next)
    else if (state.get(next) === 1) {
      const start = stack.indexOf(next)
      const cycle = stack.slice(start).map((file) => path.relative(root, file))
      const rotations = cycle.map((_, index) => [...cycle.slice(index), ...cycle.slice(0, index)].join(' -> '))
      cycleKeys.add(rotations.sort()[0])
    }
  }
  stack.pop()
  state.set(node, 2)
}
for (const node of graph.keys()) if (!state.get(node)) visit(node)
for (const cycle of cycleKeys) findings.push(`dependency cycle: ${cycle}`)

if (findings.length) {
  console.error(`Production audit failed (${findings.length} finding${findings.length === 1 ? '' : 's'}):`)
  findings.forEach((finding) => console.error(`- ${finding}`))
  process.exit(1)
}

console.log(`Production audit OK: ${modules.length} JS/JSX modules, 0 dependency cycles, 0 layer violations, 0 direct storage leaks, 0 legacy DOM events, 0 untyped buttons`)

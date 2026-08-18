import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('src')
const MAX_FEATURE_MODULE_BYTES = 32 * 1024
const CHECKED_DIRS = ['pages', 'components', 'services', 'repositories', 'core', 'api', 'domain', 'integrations']

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const modules = walk(ROOT).filter((file) => /\.(js|jsx)$/.test(file))
const oversized = modules
  .filter((file) => {
    const rel = path.relative(ROOT, file).replaceAll('\\', '/')
    return CHECKED_DIRS.some((dir) => rel.startsWith(`${dir}/`)) && fs.statSync(file).size > MAX_FEATURE_MODULE_BYTES
  })
  .map((file) => ({
    file: path.relative(process.cwd(), file).replaceAll('\\', '/'),
    bytes: fs.statSync(file).size,
  }))

if (oversized.length) {
  console.error(`Architecture structure audit failed: ${oversized.length} feature module(s) exceed ${MAX_FEATURE_MODULE_BYTES / 1024} KB.`)
  for (const item of oversized) console.error(` - ${item.file}: ${(item.bytes / 1024).toFixed(1)} KB`)
  process.exit(1)
}

console.log(`Architecture structure OK: ${modules.length} JS/JSX modules, no feature module exceeds ${MAX_FEATURE_MODULE_BYTES / 1024} KB.`)

import fs from 'node:fs'
import path from 'node:path'
import { APP_ROUTES } from '../src/config/routes.js'

const navigationFile = fs.readFileSync(path.resolve('src/data/navigation.js'), 'utf8')
const appFile = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8')
const sourceFiles = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (/\.(jsx?|mjs)$/.test(entry.name)) sourceFiles.push(full)
  }
}
walk(path.resolve('src'))

const failures = []
const navigationRouteKeys = [...navigationFile.matchAll(/path\s*:\s*APP_ROUTES\.([A-Z0-9_]+)/g)].map((match) => match[1])
const appRouteKeys = new Set([...appFile.matchAll(/path=\{APP_ROUTES\.([A-Z0-9_]+)\}/g)].map((match) => match[1]))
if (appFile.includes('path={`${APP_ROUTES.STUDIO}/*`}')) appRouteKeys.add('STUDIO_WILDCARD')

for (const key of navigationRouteKeys) {
  if (!(key in APP_ROUTES)) failures.push(`Navigation references missing APP_ROUTES.${key}`)
}

// Routes represented by a parameterized parent route rather than an exact route entry.
const parameterizedCoverage = new Map([
  ['LABORATORY_WATER', 'LABORATORY_VIEW'],
  ['LABORATORY_ENVIRONMENT', 'LABORATORY_VIEW'],
  ['LABORATORY_STAFF', 'LABORATORY_VIEW'],
  ['STUDIO', 'STUDIO_WILDCARD'],
])

for (const key of navigationRouteKeys) {
  if (appRouteKeys.has(key)) continue
  const coveringKey = parameterizedCoverage.get(key)
  if (coveringKey && appRouteKeys.has(coveringKey)) continue
  failures.push(`Sidebar destination APP_ROUTES.${key} has no Route coverage in App.jsx`)
}

if (/path\s*:\s*['"`]\//.test(navigationFile)) {
  failures.push('Navigation contains a hard-coded absolute path; use APP_ROUTES')
}

for (const file of sourceFiles) {
  const text = fs.readFileSync(file, 'utf8')
  const rel = path.relative(process.cwd(), file).replaceAll('\\', '/')
  if (/window\.location\.(assign|replace)\s*\(\s*['"`]\//.test(text)) {
    failures.push(`${rel}: full-page internal navigation detected`)
  }
  if (/navigate\s*\(\s*['"`]\//.test(text) || /navigate\s*\(\s*`\//.test(text)) {
    failures.push(`${rel}: hard-coded internal navigate() path detected`)
  }
}

if (failures.length) {
  console.error('Navigation audit failed:')
  failures.forEach((item) => console.error(`- ${item}`))
  process.exit(1)
}

console.log(`Navigation audit OK: ${navigationRouteKeys.length} sidebar destinations use APP_ROUTES and all have route coverage; no hard-coded internal navigation remains.`)

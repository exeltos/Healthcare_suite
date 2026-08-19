import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@babel/parser'

const root = path.resolve('src')
const files = []
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
  const target = path.join(dir, entry.name)
  if (entry.isDirectory()) walk(target)
  else if (/\.(js|jsx)$/.test(entry.name)) files.push(target)
})
walk(root)
let failed = false
for (const file of files) {
  try {
    parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] })
  } catch (error) {
    failed = true
    console.error(`${path.relative(process.cwd(), file)}: ${error.message}`)
  }
}
if (failed) process.exit(1)
console.log(`Syntax OK: ${files.length} JavaScript/JSX files`)

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const root='src'
const files=[]
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name)
    if(entry.isDirectory()) walk(p)
    else if(/\.(js|jsx|css)$/.test(entry.name)) files.push(p)
  }
}
walk(root)

const failures=[]
const hashes=new Map()
for(const file of files){
  const normalizedFile=file.replace(/\\/g,'/')
  const text=fs.readFileSync(file,'utf8')
  const hash=crypto.createHash('sha256').update(text).digest('hex')
  if(!hashes.has(hash))hashes.set(hash,[])
  hashes.get(hash).push(file)

  if(/\bconsole\.log\s*\(/.test(text)) failures.push(`${file}: console.log left in source`)
  if(/\b(?:localStorage|sessionStorage)\b/.test(text) && !normalizedFile.includes('/core/') && !normalizedFile.includes('/services/'))
    failures.push(`${file}: direct browser-storage access outside core/services`)
  if(/(?:navigate|window\.location\.(?:assign|href)|location\.href)\(\s*['"]\/[^'"]+/.test(text))
    failures.push(`${file}: hard-coded internal navigation path`)
}
for(const group of hashes.values()) if(group.length>1) failures.push(`Exact duplicate source files: ${group.join(', ')}`)

const appCss=fs.readFileSync('src/styles/app.css','utf8')
if(!/language-stable header geometry/.test(appCss) || !/flex:0 0 248px/.test(appCss))
  failures.push('Header right-side geometry is not fixed across EL/EN.')
if(!/text-overflow:ellipsis/.test(appCss))
  failures.push('Header user text can resize controls instead of truncating safely.')

const header=fs.readFileSync('src/components/layout/Header.jsx','utf8')
if(!/<LanguageSwitcher compact\/>/.test(header)) failures.push('Shared compact language switcher is missing from header.')


const windowsCorePath='src\\core\\storage\\sessionStorage.js'
const windowsCoreNormalized=windowsCorePath.replace(/\\/g,'/')
if(!windowsCoreNormalized.includes('/core/'))
  failures.push('Windows path normalization regression: core layer is not recognized.')

if(failures.length){
  console.error('Release candidate audit failed:')
  failures.forEach(x=>console.error('- '+x))
  process.exitCode=1
}else{
  console.log(`Release candidate audit OK: ${files.length} JS/JSX/CSS files checked; no exact duplicate files, storage leaks, console logs or hard-coded internal routes; EL/EN header geometry is stable.`)
}

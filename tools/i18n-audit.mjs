import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { translations } = await import(pathToFileURL(path.join(root, 'src/i18n/translations.js')).href)
function flatten(obj,prefix='',out={}) { for (const [k,v] of Object.entries(obj)) { const key=prefix?`${prefix}.${k}`:k; if(v&&typeof v==='object') flatten(v,key,out); else out[key]=v } return out }
const el=flatten(translations.el), en=flatten(translations.en)
const missingEn=Object.keys(el).filter(k=>!(k in en)), missingEl=Object.keys(en).filter(k=>!(k in el))
if(missingEn.length||missingEl.length){console.error('i18n parity failed',{missingEn,missingEl});process.exit(1)}
const files=[]; function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(jsx?|tsx?)$/.test(e.name))files.push(p)}} walk(path.join(root,'src'))
const used=new Set(); for(const f of files){const s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/\bt\(['"]([^'"]+)['"]/g))used.add(m[1])}
const unresolved=[...used].filter(k=>!(k in el)||!(k in en))
if(unresolved.length){console.error('Unresolved translation keys:',unresolved);process.exit(1)}
console.log(`i18n audit OK — ${used.size} referenced keys, ${Object.keys(el).length} EL/EN keys in parity.`)

import fs from 'node:fs'
import path from 'node:path'

const dir='supabase/migrations'
const files=fs.readdirSync(dir).filter(x=>x.endsWith('.sql')).sort()
const tableTypes=new Map()
for(const file of files){
  const text=fs.readFileSync(path.join(dir,file),'utf8')
  for(const m of text.matchAll(/create table if not exists public\.(\w+)\s*\((.*?)\n\);/gis)){
    const table=m[1],body=m[2],cols=new Map(tableTypes.get(table)||[])
    for(const raw of body.split('\n')){
      const line=raw.trim().replace(/,$/,'')
      const c=line.match(/^(\w+)\s+([a-zA-Z]+(?:\[\])?)\b/)
      if(c)cols.set(c[1],c[2].toLowerCase())
    }
    tableTypes.set(table,cols)
  }
}
const failures=[]
for(const file of files){
  const text=fs.readFileSync(path.join(dir,file),'utf8')
  for(const m of text.matchAll(/(\w+)\s+([a-zA-Z]+(?:\[\])?)(?:\s+(?:not\s+null|unique|default\s+[^\s,]+))*\s+references public\.(\w+)\((\w+)\)/gi)){
    const [,column,type,targetTable,targetColumn]=m
    const targetType=tableTypes.get(targetTable)?.get(targetColumn)
    if(targetType && targetType!==type.toLowerCase()){
      failures.push(`${file}: ${column} ${type} references ${targetTable}.${targetColumn} ${targetType}`)
    }
  }
}
if(failures.length){
  console.error('Migration schema audit failed:')
  failures.forEach(x=>console.error('- '+x))
  process.exitCode=1
}else{
  console.log(`Migration schema audit OK: ${files.length} migrations checked; explicit FK column types are compatible.`)
}

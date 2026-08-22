export async function hydratePatientSampleLaboratoryResults(client,rows){
  if(!rows.length)return rows
  const ids=rows.map(row=>String(row.id))
  const {data:organisms,error:orgError}=await client.from('laboratory_sample_organisms')
    .select('*').in('patient_sample_id',ids).order('created_at')
  if(orgError)throw orgError
  const organismIds=(organisms||[]).map(item=>item.id)
  let antibiograms=[]
  if(organismIds.length){
    const {data,error}=await client.from('laboratory_antibiogram_results')
      .select('*').in('organism_result_id',organismIds).order('created_at')
    if(error)throw error
    antibiograms=data||[]
  }
  const orgBySample=(organisms||[]).reduce((map,item)=>{
    const key=String(item.patient_sample_id||'')
    if(!map.has(key))map.set(key,[])
    map.get(key).push(item)
    return map
  },new Map())
  const abByOrg=(antibiograms||[]).reduce((map,item)=>{
    const key=String(item.organism_result_id||'')
    if(!map.has(key))map.set(key,[])
    map.get(key).push(item)
    return map
  },new Map())
  return rows.map(row=>{
    const rel=orgBySample.get(String(row.id))||[]
    if(!rel.length)return row
    const microorganismResults=rel.map(item=>({
      id:item.id,
      relationalId:item.id,
      name:item.microorganism||'',
      resistance:item.resistance||'',
      isPrimary:!!item.is_primary,
    }))
    const primary=rel.find(item=>item.is_primary)||rel[0]
    const antibiogram=(abByOrg.get(String(primary?.id||''))||[]).map(item=>({
      id:item.id,
      relationalId:item.id,
      antibiotic:item.antibiotic||'',
      sensitivity:item.sensitivity||'',
      mic:item.mic||'',
    }))
    return {
      ...row,
      microorganismResults,
      microorganisms:microorganismResults.map(item=>item.name),
      microorganism:microorganismResults.map(item=>item.name).join(', '),
      resistance:primary?.resistance||row.resistance||'',
      antibiogram,
    }
  })
}

export async function syncPatientSampleLaboratoryResults(client,{organizationId,sampleId,microorganismResults,antibiogram,fallbackMicroorganism,fallbackResistance}){
  const canonical=(microorganismResults||[])
    .map(item=>({
      id:item.relationalId||item.id||'',
      name:String(item.name||item.microorganism||'').trim(),
      resistance:String(item.resistance||'').trim(),
      isPrimary:Boolean(item.isPrimary),
    }))
    .filter(item=>item.name)
  if(!canonical.length && fallbackMicroorganism){
    canonical.push({id:'',name:fallbackMicroorganism,resistance:fallbackResistance||'',isPrimary:true})
  }
  if(canonical.length && !canonical.some(item=>item.isPrimary))canonical[0].isPrimary=true

  const {data:existing,error:readError}=await client.from('laboratory_sample_organisms')
    .select('*').eq('organization_id',organizationId).eq('patient_sample_id',sampleId)
  if(readError)throw readError
  const keep=new Set()
  let primarySaved=null

  for(const item of canonical){
    const current=(existing||[]).find(row=>
      (item.id&&String(row.id)===String(item.id))
      || String(row.microorganism||'').trim().toLocaleLowerCase('el-GR')===item.name.toLocaleLowerCase('el-GR')
    )
    const payload={
      organization_id:organizationId,
      patient_sample_id:sampleId,
      source_sample_id:null,
      microorganism:item.name,
      resistance:item.resistance,
      is_primary:!!item.isPrimary,
    }
    let saved
    if(current){
      const {data,error}=await client.from('laboratory_sample_organisms').update(payload).eq('id',current.id).select().single()
      if(error)throw error
      saved=data
    }else{
      const {data,error}=await client.from('laboratory_sample_organisms').insert(payload).select().single()
      if(error)throw error
      saved=data
    }
    keep.add(String(saved.id))
    if(saved.is_primary)primarySaved=saved
    item.relationalId=saved.id
  }

  for(const stale of (existing||[]).filter(row=>!keep.has(String(row.id)))){
    const {error}=await client.from('laboratory_sample_organisms').delete().eq('id',stale.id)
    if(error)throw error
  }

  if(!primarySaved && canonical.length){
    const {data,error}=await client.from('laboratory_sample_organisms')
      .select('*').eq('organization_id',organizationId).eq('patient_sample_id',sampleId).eq('is_primary',true).maybeSingle()
    if(error)throw error
    primarySaved=data
  }
  if(!primarySaved)return

  const {data:existingAb,error:abReadError}=await client.from('laboratory_antibiogram_results')
    .select('*').eq('organization_id',organizationId).eq('organism_result_id',primarySaved.id)
  if(abReadError)throw abReadError
  const abKeep=new Set()
  for(const item of (antibiogram||[]).filter(item=>String(item.antibiotic||'').trim())){
    const antibiotic=String(item.antibiotic||'').trim()
    const current=(existingAb||[]).find(row=>
      (item.relationalId&&String(row.id)===String(item.relationalId))
      || String(row.antibiotic||'').trim().toLocaleLowerCase('el-GR')===antibiotic.toLocaleLowerCase('el-GR')
    )
    const payload={
      organization_id:organizationId,
      organism_result_id:primarySaved.id,
      antibiotic,
      sensitivity:String(item.sensitivity||''),
      mic:String(item.mic||''),
    }
    let saved
    if(current){
      const {data,error}=await client.from('laboratory_antibiogram_results').update(payload).eq('id',current.id).select().single()
      if(error)throw error
      saved=data
    }else{
      const {data,error}=await client.from('laboratory_antibiogram_results').insert(payload).select().single()
      if(error)throw error
      saved=data
    }
    abKeep.add(String(saved.id))
  }
  for(const stale of (existingAb||[]).filter(row=>!abKeep.has(String(row.id)))){
    const {error}=await client.from('laboratory_antibiogram_results').delete().eq('id',stale.id)
    if(error)throw error
  }
}

import { IS_PRODUCTION } from '../../core/runtime'
import { emitAppEvent } from '../../core/events'
import { requireSupabase } from '../../integrations/supabase'
import { INDICATORS_EVENT, loadCustomIndicators, loadIndicatorSettings, saveCustomIndicators, saveIndicatorSettings } from '../indicatorsService'
import { INDICATOR_SOURCE_EVENT, loadDailyCensus,loadAntibioticDDD,loadStructuralSnapshots,loadPrevalenceSnapshots,saveDailyCensus,saveAntibioticDDD,saveStructuralSnapshots,savePrevalenceSnapshots } from '../indicatorSourceDataService'

export async function hydrateIndicatorBackend(){
  if(!IS_PRODUCTION)return {
    settings:loadIndicatorSettings(),custom:loadCustomIndicators(),
    dailyCensus:loadDailyCensus(),antibioticDDD:loadAntibioticDDD(),
    structuralSnapshots:loadStructuralSnapshots(),prevalenceSnapshots:loadPrevalenceSnapshots()
  }
  const c=requireSupabase()
  const [settingsResult,customResult,sourceResult]=await Promise.all([
    c.from('indicator_settings').select('indicator_id,settings'),
    c.from('custom_indicators').select('id,data'),
    c.from('indicator_source_records').select('source_type,record_key,record_date,data').order('record_date',{ascending:true}),
  ])
  if(settingsResult.error)throw settingsResult.error
  if(customResult.error)throw customResult.error
  if(sourceResult.error)throw sourceResult.error
  const settings=Object.fromEntries((settingsResult.data||[]).map(r=>[r.indicator_id,r.settings||{}]))
  const custom=(customResult.data||[]).map(r=>({...r.data,id:r.id}))
  const grouped={daily_census:[],antibiotic_ddd:[],structural_snapshot:[],prevalence_snapshot:[]}
  for(const r of sourceResult.data||[])grouped[r.source_type]?.push({...r.data,id:r.record_key,date:r.record_date||r.data?.date||''})
  saveIndicatorSettings(settings)
  saveCustomIndicators(custom)
  saveDailyCensus(grouped.daily_census)
  saveAntibioticDDD(grouped.antibiotic_ddd)
  saveStructuralSnapshots(grouped.structural_snapshot)
  savePrevalenceSnapshots(grouped.prevalence_snapshot)
  return {settings,custom,dailyCensus:grouped.daily_census,antibioticDDD:grouped.antibiotic_ddd,structuralSnapshots:grouped.structural_snapshot,prevalenceSnapshots:grouped.prevalence_snapshot}
}

export async function saveIndicatorSettingsBackend(settings={}){
  validateIndicatorGovernance(settings)
  if(!IS_PRODUCTION)return saveIndicatorSettings(settings)
  const c=requireSupabase(),org=await orgId(c)
  const rows=Object.entries(settings||{}).map(([indicatorId,value])=>({organization_id:org,indicator_id:indicatorId,settings:value||{}}))
  const ids=rows.map(row=>row.indicator_id)
  const {data:existing,error:readError}=await c.from('indicator_settings').select('indicator_id').eq('organization_id',org);if(readError)throw readError
  const remove=(existing||[]).map(x=>x.indicator_id).filter(id=>!ids.includes(id))
  if(remove.length){const {error}=await c.from('indicator_settings').delete().eq('organization_id',org).in('indicator_id',remove);if(error)throw error}
  if(rows.length){const {error}=await c.from('indicator_settings').upsert(rows,{onConflict:'organization_id,indicator_id'});if(error)throw error}
  saveIndicatorSettings(settings);return settings
}
export async function saveCustomIndicatorsBackend(rows=[]){
  validateCustomIndicatorGovernance(rows)
  if(!IS_PRODUCTION)return saveCustomIndicators(rows)
  const c=requireSupabase(),org=await orgId(c)
  const ids=(rows||[]).map(r=>String(r.id))
  const {data:existing,error:readError}=await c.from('custom_indicators').select('id').eq('organization_id',org);if(readError)throw readError
  const remove=(existing||[]).map(x=>String(x.id)).filter(id=>!ids.includes(id))
  if(remove.length){const {error}=await c.from('custom_indicators').delete().eq('organization_id',org).in('id',remove);if(error)throw error}
  if(rows.length){const {error}=await c.from('custom_indicators').upsert(rows.map(r=>({id:String(r.id),organization_id:org,data:r})),{onConflict:'id'});if(error)throw error}
  saveCustomIndicators(rows);return rows
}
export async function updateIndicatorSettingBackend(id,patch){
  const current=loadIndicatorSettings();return saveIndicatorSettingsBackend({...current,[id]:{...(current[id]||{}),...patch}})
}

export async function loadIndicatorDefinitionHistory(indicatorId,{limit=30}={}){
  if(!IS_PRODUCTION)return []
  const c=requireSupabase()
  const {data,error}=await c.from('indicator_definition_history')
    .select('history_id,indicator_id,definition_version,settings,changed_at,changed_by,change_type')
    .eq('indicator_id',String(indicatorId)).order('changed_at',{ascending:false}).limit(limit)
  if(error)throw error
  return data||[]
}

export async function saveIndicatorSourceBackend(type,rows=[]){
  const local=localWriter(type)
  if(!IS_PRODUCTION)return local(rows)
  const c=requireSupabase(),org=await orgId(c)
  const {error:delError}=await c.from('indicator_source_records').delete().eq('organization_id',org).eq('source_type',type);if(delError)throw delError
  if(rows.length){
    const payload=rows.map((r,i)=>({organization_id:org,source_type:type,record_key:String(r.id||r.key||`${type}-${i}-${r.date||''}`),record_date:date(r.date),data:r}))
    const {error}=await c.from('indicator_source_records').insert(payload);if(error)throw error
  }
  local(rows);return rows
}

export async function saveIndicatorSourceRecordBackend(type,row={}){
  const local=localWriter(type)
  const key=String(row.id||row.key||'').trim()
  if(!key)throw new Error('Indicator source record requires an id.')
  if(!IS_PRODUCTION){
    const current=localReader(type)()
    const next=current.some(x=>String(x.id)===key)?current.map(x=>String(x.id)===key?row:x):[row,...current]
    local(next);return row
  }
  const c=requireSupabase(),org=await orgId(c)
  const payload={organization_id:org,source_type:type,record_key:key,record_date:date(row.date),data:row}
  const {data,error}=await c.from('indicator_source_records')
    .upsert(payload,{onConflict:'organization_id,source_type,record_key'})
    .select('source_type,record_key,record_date,data').single()
  if(error)throw error
  const {data:verified,error:verifyError}=await c.from('indicator_source_records')
    .select('source_type,record_key,record_date,data')
    .eq('organization_id',org).eq('source_type',type).eq('record_key',key).single()
  if(verifyError)throw verifyError
  if(!verified)throw new Error('The record was not found after saving to Supabase.')
  const saved={...(verified.data||{}),id:verified.record_key,date:verified.record_date||verified.data?.date||''}
  const current=localReader(type)()
  const next=current.some(x=>String(x.id)===key)?current.map(x=>String(x.id)===key?saved:x):[saved,...current]
  local(next);return saved
}

export async function deleteIndicatorSourceRecordBackend(type,keyValue){
  const local=localWriter(type), key=String(keyValue||'').trim()
  if(!key)throw new Error('Indicator source record requires an id.')
  if(!IS_PRODUCTION){const next=localReader(type)().filter(x=>String(x.id)!==key);local(next);return true}
  const c=requireSupabase(),org=await orgId(c)
  const {data,error}=await c.from('indicator_source_records').delete()
    .eq('organization_id',org).eq('source_type',type).eq('record_key',key).select('record_key')
  if(error)throw error
  if(!(data||[]).some(x=>String(x.record_key)===key))throw new Error('Supabase did not confirm deletion of the record.')
  const next=localReader(type)().filter(x=>String(x.id)!==key);local(next);return true
}

function localWriter(type){if(type==='daily_census')return saveDailyCensus;if(type==='antibiotic_ddd')return saveAntibioticDDD;if(type==='structural_snapshot')return saveStructuralSnapshots;if(type==='prevalence_snapshot')return savePrevalenceSnapshots;throw new Error('Unknown indicator source type.')}
function localReader(type){if(type==='daily_census')return loadDailyCensus;if(type==='antibiotic_ddd')return loadAntibioticDDD;if(type==='structural_snapshot')return loadStructuralSnapshots;if(type==='prevalence_snapshot')return loadPrevalenceSnapshots;throw new Error('Unknown indicator source type.')}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
function date(v){const s=String(v||'').trim();return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null}

function validateIndicatorGovernance(settings={}){
  for(const [id,value] of Object.entries(settings||{})){
    if(!value||typeof value!=='object')continue
    if(value.warningThreshold!==''&&value.warningThreshold!=null&&!Number.isFinite(Number(value.warningThreshold)))throw new Error(`Indicator ${id} warning threshold must be numeric.`)
    if(value.governanceVersion!=null&&!String(value.governanceVersion).trim())throw new Error(`Indicator ${id} definition version cannot be blank.`)
  }
}
function validateCustomIndicatorGovernance(rows=[]){
  const ids=new Set()
  for(const row of rows||[]){
    const id=String(row?.id||'').trim()
    if(!id)throw new Error('Custom indicator requires an id.')
    if(ids.has(id))throw new Error('Custom indicator ids must be unique.')
    ids.add(id)
    if(!String(row?.name||'').trim())throw new Error('Custom indicator requires a name.')
    if(row.warningThreshold!==''&&row.warningThreshold!=null&&!Number.isFinite(Number(row.warningThreshold)))throw new Error(`Indicator ${id} warning threshold must be numeric.`)
  }
}

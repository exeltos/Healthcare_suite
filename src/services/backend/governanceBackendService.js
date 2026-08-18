import { IS_PRODUCTION } from '../../core/runtime'
import { readJsonObject, writeJson } from '../../core/storage'
import { requireSupabase } from '../../integrations/supabase'
import { emitAppEvent } from '../../core/events'
import { loadOperationalTraining } from './organizationBackendService'

const DEMO_KEY='healthcare-suite.governance-demo-v1'
export const GOVERNANCE_EVENT='healthcare-suite:governance-updated'

const DEFAULT_NOTIFICATION_POLICIES=[
  {policy_key:'critical_lab_result',enabled:true,severity:'danger',escalation_after_hours:1,settings:{closedLoop:true,recipientRoles:['laboratory','infection_control_lead']}},
  {policy_key:'serious_incident',enabled:true,severity:'danger',escalation_after_hours:4,settings:{recipientRoles:['admin','infection_control_lead']}},
  {policy_key:'overdue_capa',enabled:true,severity:'danger',escalation_after_hours:24,settings:{recipientRoles:['admin','infection_control_lead']}},
  {policy_key:'document_review_overdue',enabled:true,severity:'warning',escalation_after_hours:24,settings:{recipientRoles:['admin']}},
  {policy_key:'competency_followup',enabled:true,severity:'warning',escalation_after_hours:24,settings:{recipientRoles:['admin']}},
]
const DEFAULT_RETENTION=[
  {policy_key:'clinical',record_category:'Clinical records',retention_years:20,disposition:'archive',owner:'DPO / Medical Service',legal_basis:'Confirm against applicable law and organization policy.',active:true},
  {policy_key:'quality',record_category:'Quality / CAPA / Audits',retention_years:10,disposition:'archive',owner:'Quality Manager',legal_basis:'Organization retention policy.',active:true},
  {policy_key:'documents',record_category:'Controlled documents',retention_years:10,disposition:'archive',owner:'Quality Manager',legal_basis:'Version history and implementation evidence.',active:true},
  {policy_key:'training',record_category:'Training / Competency',retention_years:10,disposition:'archive',owner:'Training / HR',legal_basis:'Training and competency evidence.',active:true},
  {policy_key:'audit',record_category:'System audit trail',retention_years:10,disposition:'archive',owner:'IT / DPO',legal_basis:'Security and accountability evidence.',active:true},
]
const DEFAULT_CONTINUITY={profile_key:'primary',backup_provider:'',backup_scope:'Database + Storage + Auth configuration',backup_frequency:'',rpo_hours:'',rto_hours:'',responsible_owner:'',recovery_runbook_location:'',last_backup_verified_at:'',last_restore_test_at:'',last_restore_test_result:'not_tested',next_restore_test_due:'',notes:''}
const DEFAULT_PRIVACY={profile_key:'primary',controller_name:'',dpo_owner:'',processor_contract_confirmed:false,hosting_region_confirmed:false,backup_region_confirmed:false,breach_process_confirmed:false,dsar_process_confirmed:false,retention_policy_confirmed:false,attachment_access_reviewed:false,analytics_deidentification_reviewed:false,last_reviewed_at:'',notes:''}

function demoState(){
  const saved=readJsonObject(DEMO_KEY,{})
  return {
    notifications:saved.notifications||DEFAULT_NOTIFICATION_POLICIES,
    retention:saved.retention||DEFAULT_RETENTION,
    continuity:saved.continuity||DEFAULT_CONTINUITY,
    recoveryTests:saved.recoveryTests||[],
    privacy:saved.privacy||DEFAULT_PRIVACY,
  }
}
function saveDemo(patch){
  const next={...demoState(),...patch}
  writeJson(DEMO_KEY,next)
  return next
}
async function orgId(c){
  const {data,error}=await c.rpc('current_organization_id')
  if(error)throw error
  if(!data)throw new Error('Organization context not found.')
  return data
}

export async function loadAuditTrail({limit=250}={}){
  if(!IS_PRODUCTION)return []
  const c=requireSupabase()
  const {data,error}=await c.from('system_audit_log')
    .select('audit_id,occurred_at,actor_user_id,actor_role,entity_type,entity_id,action,changed_fields,old_values,new_values,reason,source,request_id')
    .order('occurred_at',{ascending:false}).limit(limit)
  if(error)throw error
  return data||[]
}

export async function loadSecurityEvents({limit=200}={}){
  if(!IS_PRODUCTION)return []
  const c=requireSupabase()
  const {data,error}=await c.from('security_auth_events')
    .select('id,user_id,event_type,occurred_at,details')
    .order('occurred_at',{ascending:false}).limit(limit)
  if(error)throw error
  return data||[]
}

export async function loadNotificationPolicies(){
  if(!IS_PRODUCTION)return demoState().notifications
  const c=requireSupabase()
  const {data,error}=await c.from('notification_escalation_policies').select('*').order('policy_key')
  if(error)throw error
  return data||[]
}
export async function saveNotificationPolicy(row){
  if(!IS_PRODUCTION){
    const rows=demoState().notifications.map(x=>x.policy_key===row.policy_key?{...x,...row}:x)
    saveDemo({notifications:rows}); emitAppEvent(GOVERNANCE_EVENT,{type:'notification-policy',key:row.policy_key}); return row
  }
  const c=requireSupabase(), organization_id=await orgId(c)
  const payload={organization_id,policy_key:row.policy_key,enabled:!!row.enabled,severity:row.severity||'warning',
    escalation_after_hours:row.escalation_after_hours===''||row.escalation_after_hours==null?null:Number(row.escalation_after_hours),
    settings:row.settings&&typeof row.settings==='object'?row.settings:{}}
  const {data,error}=await c.from('notification_escalation_policies').upsert(payload,{onConflict:'organization_id,policy_key'}).select().single()
  if(error)throw error
  emitAppEvent(GOVERNANCE_EVENT,{type:'notification-policy',key:row.policy_key})
  return data
}

export async function loadRetentionPolicies(){
  if(!IS_PRODUCTION)return demoState().retention
  const c=requireSupabase()
  const {data,error}=await c.from('data_retention_policies').select('*').order('policy_key')
  if(error)throw error
  return data||[]
}
export async function saveRetentionPolicy(row){
  if(!IS_PRODUCTION){
    const rows=demoState().retention.map(x=>x.policy_key===row.policy_key?{...x,...row}:x)
    saveDemo({retention:rows}); return row
  }
  const c=requireSupabase(), organization_id=await orgId(c)
  const payload={organization_id,policy_key:row.policy_key,record_category:row.record_category,retention_years:Number(row.retention_years),
    disposition:row.disposition||'archive',owner:row.owner||'',legal_basis:row.legal_basis||'',active:row.active!==false}
  const {data,error}=await c.from('data_retention_policies').upsert(payload,{onConflict:'organization_id,policy_key'}).select().single()
  if(error)throw error
  return data
}

export async function loadContinuityProfile(){
  if(!IS_PRODUCTION)return demoState().continuity
  const c=requireSupabase()
  const {data,error}=await c.from('continuity_recovery_profiles').select('*').eq('profile_key','primary').maybeSingle()
  if(error)throw error
  return data||DEFAULT_CONTINUITY
}
export async function saveContinuityProfile(row){
  if(!IS_PRODUCTION){saveDemo({continuity:{...DEFAULT_CONTINUITY,...row}});return row}
  const c=requireSupabase(),organization_id=await orgId(c)
  const payload={...row,organization_id,profile_key:'primary',
    rpo_hours:row.rpo_hours===''||row.rpo_hours==null?null:Number(row.rpo_hours),
    rto_hours:row.rto_hours===''||row.rto_hours==null?null:Number(row.rto_hours),
    last_backup_verified_at:row.last_backup_verified_at||null,last_restore_test_at:row.last_restore_test_at||null,
    next_restore_test_due:row.next_restore_test_due||null}
  const {data,error}=await c.from('continuity_recovery_profiles').upsert(payload,{onConflict:'organization_id,profile_key'}).select().single()
  if(error)throw error
  return data
}
export async function loadRecoveryTests(){
  if(!IS_PRODUCTION)return demoState().recoveryTests
  const c=requireSupabase()
  const {data,error}=await c.from('continuity_recovery_tests').select('*').order('tested_at',{ascending:false}).limit(100)
  if(error)throw error
  return data||[]
}
export async function saveRecoveryTest(row){
  if(!IS_PRODUCTION){
    const next={...row,id:row.id||`demo-${Date.now()}`,tested_at:row.tested_at||new Date().toISOString()}
    const rows=[next,...demoState().recoveryTests]
    saveDemo({recoveryTests:rows});return next
  }
  const c=requireSupabase(),organization_id=await orgId(c)
  const payload={organization_id,tested_at:row.tested_at||new Date().toISOString(),test_type:row.test_type||'restore',
    scope:row.scope||'',result:row.result||'passed',
    actual_rpo_hours:row.actual_rpo_hours===''||row.actual_rpo_hours==null?null:Number(row.actual_rpo_hours),
    actual_rto_hours:row.actual_rto_hours===''||row.actual_rto_hours==null?null:Number(row.actual_rto_hours),
    evidence_reference:row.evidence_reference||'',findings:row.findings||'',corrective_action_reference:row.corrective_action_reference||''}
  const {data,error}=await c.from('continuity_recovery_tests').insert(payload).select().single()
  if(error)throw error
  return data
}

export async function loadPrivacyProfile(){
  if(!IS_PRODUCTION)return demoState().privacy
  const c=requireSupabase()
  const {data,error}=await c.from('privacy_governance_profiles').select('*').eq('profile_key','primary').maybeSingle()
  if(error)throw error
  return data||DEFAULT_PRIVACY
}
export async function savePrivacyProfile(row){
  if(!IS_PRODUCTION){saveDemo({privacy:{...DEFAULT_PRIVACY,...row}});return row}
  const c=requireSupabase(),organization_id=await orgId(c)
  const payload={...row,organization_id,profile_key:'primary',last_reviewed_at:row.last_reviewed_at||null}
  const {data,error}=await c.from('privacy_governance_profiles').upsert(payload,{onConflict:'organization_id,profile_key'}).select().single()
  if(error)throw error
  return data
}

export async function loadCompetencyGaps(){
  const training=await loadOperationalTraining()
  const today=new Date().toISOString().slice(0,10)
  const rows=[]
  for(const course of training||[]){
    for(const att of course.attendance||[]){
      if(!['Παρών','Online'].includes(att.status))continue
      const validUntil=att.competencyValidUntil||course.validUntil||''
      const result=att.competencyResult||''
      const expired=Boolean(validUntil&&validUntil<today)
      const pending=Boolean(course.competencyRequired&&result!=='Επαρκής')
      const retraining=String(result).toLocaleLowerCase('el-GR').includes('επανεκπα')
      if(expired||pending||retraining)rows.push({
        id:`${course.id}:${att.employeeId||att.employeeName}`,
        employeeName:att.employeeName||'—',department:att.department||course.department||'',
        trainingTitle:course.title||'',competencyResult:result||'—',validUntil,
        reason:expired?'expired':retraining?'retraining':'pending',trainingId:course.id
      })
    }
  }
  return rows
}

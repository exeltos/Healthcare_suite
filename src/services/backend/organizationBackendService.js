import { IS_PRODUCTION } from '../../core/runtime'
import { requireSupabase } from '../../integrations/supabase'
import { loadTraining,upsertTraining,deleteTraining,loadCommittees,upsertCommittee,deleteCommittee,loadDocuments,upsertDocument,deleteDocument,replaceTrainingCollection,replaceCommitteesCollection,replaceDocumentsCollection } from '../organizationService'

export async function loadOperationalTraining(){
  if(!IS_PRODUCTION)return loadTraining()
  const c=requireSupabase();const {data,error}=await c.from('training_records').select('*,department:departments(id,name)').order('training_date',{ascending:false});if(error)throw error
  const base=(data||[]).map(mapTraining)
  const rows=await hydrateRelationalTraining(c,base)
  if(JSON.stringify(loadTraining())!==JSON.stringify(rows))replaceTrainingCollection(rows)
  return rows
}
export async function saveOperationalTraining(input={}){
  if(!IS_PRODUCTION)return upsertTraining(input)
  const c=requireSupabase(),org=await orgId(c),actor=await actorId(c),dep=await departmentId(c,org,input.department),row={...input,id:input.id||`TR-${Date.now()}`}
  const trainingDate=date(row.date),validUntil=date(row.validUntil)
  if(!String(row.title||'').trim()||!trainingDate)throw new Error('Training title and date are required.')
  if(validUntil&&validUntil<trainingDate)throw new Error('Training validity date cannot precede the training date.')
  const attendance=Array.isArray(row.attendance)?row.attendance:[]
  const employeeIds=[...new Set(attendance.map(item=>String(item.employeeId||'').trim()).filter(Boolean))]
  let staffMap=new Map()
  if(employeeIds.length){
    const {data:staff,error:staffError}=await c.from('employees').select('id,department_id,status,professional_category,department:departments(id,name)').eq('organization_id',org).in('id',employeeIds)
    if(staffError)throw staffError
    staffMap=new Map((staff||[]).map(item=>[String(item.id),item]))
    for(const item of attendance){
      if(!item.employeeId)continue
      const employee=staffMap.get(String(item.employeeId))
      if(!employee)throw new Error('Training attendance contains an employee outside the current organization.')
      if(employee.status==='inactive'&&String(row.status||'')!=='Ολοκληρωμένη')throw new Error('Inactive employees cannot be newly assigned to training.')
    }
  }
  const seenAttendance=new Set()
  for(const item of attendance){
    const key=String(item.employeeId||item.employeeName||'').trim().toLocaleLowerCase('el-GR')
    if(key&&seenAttendance.has(key))throw new Error('Training attendance contains the same employee more than once.')
    if(key)seenAttendance.add(key)
  }
  if(row.status==='Ολοκληρωμένη' && row.competencyRequired){
    const missing=attendance.filter(item=>['Παρών','Online'].includes(String(item.status||'')) && !String(item.competencyResult||'').trim())
    if(missing.length)throw new Error('Completed competency training requires an assessment result for each completed attendee.')
  }
  const payload={id:String(row.id),organization_id:org,department_id:dep,title:String(row.title||''),category:String(row.category||''),trainer:String(row.trainer||''),training_date:trainingDate,status:String(row.status||'Προγραμματισμένη'),duration_hours:Number(row.durationHours||0),valid_until:validUntil,attendance,attachments:Array.isArray(row.attachments)?row.attachments:[],notes:String(row.notes||''),data:rest(row,['id','department','title','category','trainer','date','status','durationHours','validUntil','attendance','attachments','notes','createdAt','updatedAt'])}
  const {data:saved,error}=await c.from('training_records').upsert(payload,{onConflict:'id'}).select('*,department:departments(id,name)').single();if(error)throw error
  await syncTrainingAttendees(c,{org,actor,row,staffMap})
  const hydrated=await hydrateRelationalTraining(c,[mapTraining(saved)])
  const verified=hydrated[0]
  if((verified?.attendance||[]).length!==attendance.length)throw new Error('Training attendee relational verification failed.')
  for(const expected of attendance){
    const match=(verified?.attendance||[]).find(item=>
      (expected.employeeId&&String(item.employeeId||'')===String(expected.employeeId))
      ||(expected.relationalId&&String(item.relationalId||'')===String(expected.relationalId))
      ||(!expected.employeeId&&String(item.employeeName||'').trim()===String(expected.employeeName||'').trim())
    )
    if(!match)throw new Error('Training attendee relational read-back failed.')
    if(String(match.score||'')!==String(expected.score||'') || String(match.competencyResult||'')!==String(expected.competencyResult||'')){
      throw new Error('Training attendee assessment fields were not persisted.')
    }
    if(String(expected.competencyResult||'').trim() && !String(match.assessedByUserId||'').trim()){
      throw new Error('Training assessor user id was not persisted.')
    }
  }
  return verified
}

async function hydrateRelationalTraining(c,rows){
  if(!rows.length)return rows
  const ids=rows.map(row=>String(row.id))
  const {data,error}=await c.from('training_attendees').select('*').in('training_id',ids).order('created_at')
  if(error)throw error
  const groups=(data||[]).reduce((map,item)=>{
    const key=String(item.training_id||'')
    if(!map.has(key))map.set(key,[])
    map.get(key).push(item)
    return map
  },new Map())
  return rows.map(row=>{
    const relational=groups.get(String(row.id))||[]
    if(!relational.length)return row
    const attendance=relational.map(item=>({
      attendeeId:item.id,
      relationalId:item.id,
      employeeId:item.employee_id||'',
      employeeName:item.employee_name||'',
      department:item.department_name||'',
      departmentId:item.department_id||'',
      professionalCategory:item.professional_category||'',
      status:item.attendance_status||'Προγραμματισμένος',
      score:item.score==null?'':String(item.score),
      competencyResult:item.competency_result||'',
      competencyNotes:item.competency_notes||'',
      competencyValidUntil:item.competency_valid_until||'',
      assessedBy:item.assessed_by_name||'',
      assessedByUserId:item.assessed_by_user_id||'',
      assessedAt:item.assessed_at?String(item.assessed_at).slice(0,10):'',
      certificate:item.certificate_data??null,
      manual:!!item.is_manual,
    }))
    return {...row,attendance}
  })
}

async function syncTrainingAttendees(c,{org,actor,row,staffMap}){
  const attendance=Array.isArray(row.attendance)?row.attendance:[]
  const {data:existing,error:readError}=await c.from('training_attendees').select('*').eq('organization_id',org).eq('training_id',String(row.id))
  if(readError)throw readError
  const keep=new Set()
  for(const item of attendance){
    const employeeId=String(item.employeeId||'').trim()||null
    const current=(existing||[]).find(entry=>
      employeeId
        ? String(entry.employee_id||'')===employeeId
        : (!entry.employee_id && (
            String(entry.id||'')===String(item.relationalId||item.attendeeId||'')
            || String(entry.employee_name||'').trim().toLocaleLowerCase('el-GR')===String(item.employeeName||'').trim().toLocaleLowerCase('el-GR')
          ))
    )
    const staff=employeeId?staffMap.get(employeeId):null
    const department=one(staff?.department)
    const hasAssessment=Boolean(
      String(item.competencyResult||'').trim()
      || String(item.score||'').trim()
      || String(item.competencyNotes||'').trim()
      || item.assessedAt
    )
    const numericScore=String(item.score||'').trim()===''?null:Number(String(item.score).replace(',','.'))
    if(numericScore!==null&&!Number.isFinite(numericScore))throw new Error('Training attendee score must be numeric.')
    const payload={
      organization_id:org,
      training_id:String(row.id),
      employee_id:employeeId,
      employee_name:String(item.employeeName||''),
      department_id:staff?.department_id||item.departmentId||null,
      department_name:String(department?.name||item.department||''),
      professional_category:String(staff?.professional_category||item.professionalCategory||''),
      attendance_status:String(item.status||'Προγραμματισμένος'),
      score:numericScore,
      competency_result:String(item.competencyResult||''),
      competency_notes:String(item.competencyNotes||''),
      competency_valid_until:date(item.competencyValidUntil),
      assessed_by_user_id:hasAssessment?(item.assessedByUserId||actor):null,
      assessed_by_name:String(item.assessedBy||''),
      assessed_at:date(item.assessedAt)?`${date(item.assessedAt)}T00:00:00Z`:null,
      certificate_data:item.certificate??null,
      is_manual:!!item.manual,
      created_by:current?.created_by||actor,
    }
    let saved
    if(current){
      const {data,error}=await c.from('training_attendees').update(payload).eq('id',current.id).select().single()
      if(error)throw error
      saved=data
    }else{
      const {data,error}=await c.from('training_attendees').insert(payload).select().single()
      if(error)throw error
      saved=data
    }
    keep.add(String(saved.id))
    item.relationalId=saved.id
    item.attendeeId=saved.id
  }
  const stale=(existing||[]).filter(item=>!keep.has(String(item.id)))
  for(const item of stale){
    const {error}=await c.from('training_attendees').delete().eq('id',item.id)
    if(error)throw error
  }
}

export async function deleteOperationalTraining(id){
  if(!IS_PRODUCTION)return deleteTraining(id)
  const c=requireSupabase();const {error}=await c.from('training_records').delete().eq('id',String(id));if(error)throw error;return true
}

export async function loadOperationalCommittees(){
  if(!IS_PRODUCTION)return loadCommittees()
  const c=requireSupabase();const {data,error}=await c.from('committees').select('*').order('name');if(error)throw error
  const base=(data||[]).map(mapCommittee)
  const rows=await hydrateRelationalCommittees(c,base)
  if(JSON.stringify(loadCommittees())!==JSON.stringify(rows))replaceCommitteesCollection(rows);return rows
}
export async function saveOperationalCommittee(input={}){
  if(!IS_PRODUCTION)return upsertCommittee(input)
  const c=requireSupabase(),org=await orgId(c),actor=await actorId(c),row=ensureCommitteeRelationalIds({...input,id:input.id||`CM-${Date.now()}`})
  if(!String(row.name||'').trim())throw new Error('Committee name is required.')
  const {data:duplicateCommittee,error:duplicateCommitteeError}=await c.from('committees').select('id').eq('organization_id',org).ilike('name',String(row.name).trim()).neq('id',String(row.id)).limit(1)
  if(duplicateCommitteeError)throw duplicateCommitteeError
  if(duplicateCommittee?.length)throw new Error('Committee name already exists.')
  const members=Array.isArray(row.members)?row.members:[]
  const employeeIds=[...new Set(members.map(item=>String(item.employeeId||'').trim()).filter(Boolean))]
  let staffMap=new Map()
  if(employeeIds.length){const {data:staff,error:staffError}=await c.from('employees').select('id,department_id,department:departments(id,name)').eq('organization_id',org).in('id',employeeIds);if(staffError)throw staffError;if((staff||[]).length!==employeeIds.length)throw new Error('Committee contains a registry member outside the current organization.');staffMap=new Map((staff||[]).map(item=>[String(item.id),item]))}
  const memberKeys=new Set()
  for(const member of members){const key=String(member.employeeId||member.fullName||'').trim().toLocaleLowerCase('el-GR');if(key&&memberKeys.has(key))throw new Error('Committee contains the same member more than once.');if(key)memberKeys.add(key)}
  const meetings=Array.isArray(row.meetings)?row.meetings:[]
  for(const mt of meetings){
    if(new Set(mt.presentIds||[]).size!==(mt.presentIds||[]).length)throw new Error('Meeting attendance contains duplicate presence.')
    const attendance=Array.isArray(mt.attendance)?mt.attendance:[]
    const attendanceKeys=attendance.map(item=>String(item.memberId||item.employeeId||item.fullName||'').trim().toLocaleLowerCase('el-GR')).filter(Boolean)
    if(new Set(attendanceKeys).size!==attendanceKeys.length)throw new Error('Meeting attendance snapshot contains duplicate members.')
    const present=attendance.filter(item=>item.present).length
    const required=Math.max(1,Math.ceil(attendance.length/2))
    if(mt.status==='Οριστικοποιημένη'){
      if(!String(mt.minutes||'').trim())throw new Error('Finalized committee meeting requires minutes.')
      if(attendance.length&&present<required&&!String(mt.quorumOverrideReason||'').trim())throw new Error('Finalized committee meeting without quorum requires an exception reason.')
    }
    for(const action of mt.actions||[]){if(action.dueDate&&mt.date&&action.dueDate<mt.date)throw new Error('Decision action due date cannot precede the meeting date.')}
  }
  if(row.lastMeeting&&row.nextMeeting&&row.nextMeeting<row.lastMeeting)throw new Error('Next committee meeting cannot precede the last meeting.')
  const memberIds=members.map(item=>String(item.employeeId||'').trim()).filter(Boolean)
  const payload={id:String(row.id),organization_id:org,name:String(row.name||''),committee_type:String(row.type||'Επιτροπή'),chair:String(row.chair||''),secretary:String(row.secretary||''),last_meeting:date(row.lastMeeting),next_meeting:date(row.nextMeeting),status:String(row.status||'Ενεργή'),frequency:String(row.frequency||''),member_ids:memberIds,members,agenda:Array.isArray(row.agenda)?row.agenda:[],meetings,attachments:Array.isArray(row.attachments)?row.attachments:[],purpose:String(row.purpose||''),notes:String(row.notes||''),data:rest(row,['id','name','type','chair','secretary','lastMeeting','nextMeeting','status','frequency','memberIds','members','agenda','meetings','attachments','purpose','notes','createdAt','updatedAt'])}
  const {data:saved,error}=await c.from('committees').upsert(payload,{onConflict:'id'}).select().single();if(error)throw error
  await syncCommitteeRelations(c,{org,actor,row,staffMap})
  const hydrated=await hydrateRelationalCommittees(c,[mapCommittee(saved)])
  const verified=hydrated[0]
  for(const expected of members){
    const match=(verified?.members||[]).find(item=>
      (expected.employeeId&&String(item.employeeId||'')===String(expected.employeeId))
      ||(expected.relationalId&&String(item.relationalId||'')===String(expected.relationalId))
      ||(!expected.employeeId&&!expected.relationalId&&String(item.fullName||'').trim()===String(expected.fullName||'').trim())
    )
    if(!match)throw new Error('Committee member relational verification failed.')
    if(String(match.role||'')!==String(expected.role||'')||String(match.duties||'')!==String(expected.duties||''))
      throw new Error('Committee member relational field verification failed.')
  }
  return verified
}
export async function deleteOperationalCommittee(id){
  if(!IS_PRODUCTION)return deleteCommittee(id)
  const c=requireSupabase();const {error}=await c.from('committees').delete().eq('id',String(id));if(error)throw error;return true
}

export async function loadOperationalDocuments(){
  if(!IS_PRODUCTION)return loadDocuments()
  const c=requireSupabase();const {data,error}=await c.from('controlled_documents').select('*').order('title');if(error)throw error
  const rows=(data||[]).map(mapDocument);if(JSON.stringify(loadDocuments())!==JSON.stringify(rows))replaceDocumentsCollection(rows);return rows
}
export async function saveOperationalDocument(input={}){
  if(!IS_PRODUCTION)return upsertDocument(input)
  const c=requireSupabase(),org=await orgId(c),row={...input,id:input.id||`DOC-${Date.now()}`}
  if(!String(row.title||'').trim()||!String(row.code||'').trim())throw new Error('Document title and code are required.')
  const {data:duplicateDocument,error:duplicateDocumentError}=await c.from('controlled_documents').select('id').eq('organization_id',org).ilike('code',String(row.code).trim()).neq('id',String(row.id)).limit(1)
  if(duplicateDocumentError)throw duplicateDocumentError
  if(duplicateDocument?.length)throw new Error('Document code already exists.')
  if(row.status==='Σε ισχύ'&&!(Array.isArray(row.attachments)&&row.attachments.length))throw new Error('An in-force document must have at least one attachment.')
  if(row.status==='Σε ισχύ'&&(!String(row.approvedBy||'').trim()||!String(row.approvedAt||'').trim()||!String(row.effectiveDate||'').trim()))throw new Error('An in-force document requires approval metadata.')
  if(row.status==='Προς έγκριση'&&!(Array.isArray(row.attachments)&&row.attachments.length))throw new Error('A document pending approval must have an attachment.')
  const versions=Array.isArray(row.versions)?row.versions:[]
  const versionKeys=versions.map(v=>String(v.version||'').trim()).filter(Boolean)
  if(new Set(versionKeys).size!==versionKeys.length)throw new Error('Document version history contains duplicate version numbers.')
  const payload={id:String(row.id),organization_id:org,title:String(row.title||''),code:String(row.code||''),category:String(row.category||''),version:String(row.version||''),owner:String(row.owner||''),status:String(row.status||'Σε ισχύ'),review_date:date(row.reviewDate),attachments:Array.isArray(row.attachments)?row.attachments:[],versions:Array.isArray(row.versions)?row.versions:[],data:rest(row,['id','title','code','category','version','owner','status','reviewDate','attachments','versions','createdAt','updatedAt'])}
  const {data,error}=await c.from('controlled_documents').upsert(payload,{onConflict:'id'}).select().single();if(error)throw error;return mapDocument(data)
}
export async function deleteOperationalDocument(id){
  if(!IS_PRODUCTION)return deleteDocument(id)
  const c=requireSupabase();const {data:row,error:readError}=await c.from('controlled_documents').select('status').eq('id',String(id)).single();if(readError)throw readError
  if(row?.status!=='Πρόχειρο')throw new Error('Only draft controlled documents can be deleted.')
  const {error}=await c.from('controlled_documents').delete().eq('id',String(id));if(error)throw error;return true
}


async function hydrateRelationalCommittees(c,rows){
  if(!rows.length)return rows
  const ids=rows.map(r=>String(r.id))
  const [membersRes,meetingsRes,decisionsRes]=await Promise.all([
    c.from('committee_members').select('*').in('committee_id',ids).eq('is_active',true).order('created_at'),
    c.from('committee_meetings').select('*').in('committee_id',ids).order('meeting_date',{ascending:false}),
    c.from('committee_decisions').select('*').in('committee_id',ids).order('decision_date',{ascending:false}),
  ])
  if(membersRes.error)throw membersRes.error;if(meetingsRes.error)throw meetingsRes.error;if(decisionsRes.error)throw decisionsRes.error
  const meetingIds=(meetingsRes.data||[]).map(x=>x.id)
  let attendees=[],agenda=[]
  if(meetingIds.length){
    const [a,g]=await Promise.all([
      c.from('committee_meeting_attendees').select('*').in('meeting_id',meetingIds).order('created_at'),
      c.from('committee_agenda_items').select('*').in('meeting_id',meetingIds).order('position'),
    ])
    if(a.error)throw a.error;if(g.error)throw g.error;attendees=a.data||[];agenda=g.data||[]
  }
  const byCommittee=(arr,key='committee_id')=>arr.reduce((m,x)=>{const k=String(x[key]||'');if(!m.has(k))m.set(k,[]);m.get(k).push(x);return m},new Map())
  const memberGroups=byCommittee(membersRes.data||[]),meetingGroups=byCommittee(meetingsRes.data||[]),decisionGroups=byCommittee(decisionsRes.data||[])
  const attendeesByMeeting=byCommittee(attendees,'meeting_id'),agendaByMeeting=byCommittee(agenda,'meeting_id')
  return rows.map(row=>{
    const relationalMembers=memberGroups.get(String(row.id))||[]
    const members=relationalMembers.length?relationalMembers.map(m=>({id:m.employee_id?`employee-${m.employee_id}`:`manual-${m.id}`,relationalId:m.id,employeeId:m.employee_id||'',fullName:m.full_name||'',role:m.role||'Μέλος',duties:m.duties||'',capacity:m.professional_category||'',department:m.department_name||'',departmentId:m.department_id||'',manual:!!m.is_manual})):row.members
    const relationalMeetings=meetingGroups.get(String(row.id))||[]
    const decisions=decisionGroups.get(String(row.id))||[]
    const meetings=relationalMeetings.length?relationalMeetings.map(mt=>{
      const legacy=(row.meetings||[]).find(x=>String(x.relationalId||x.id||'')===String(mt.id))||(row.meetings||[]).find(x=>x.date===mt.meeting_date&&String(x.title||'')===String(mt.title||''))||{}
      const attendance=(attendeesByMeeting.get(String(mt.id))||[]).map(a=>({relationalId:a.id,memberId:a.committee_member_id||'',employeeId:a.employee_id||'',fullName:a.full_name||'',role:a.role||'',present:a.attendance_status==='Παρόν',attendanceNotes:a.attendance_notes||''}))
      const items=(agendaByMeeting.get(String(mt.id))||[]).map(item=>{const d=decisions.find(x=>String(x.agenda_item_id||'')===String(item.id));return {id:String(item.id),relationalId:item.id,decisionRelationalId:d?.id||'',title:item.title||'',presenter:item.presenter||'',discussion:item.description||'',decision:d?.decision_text||''}})
      const actions=decisions.filter(x=>String(x.meeting_id||'')===String(mt.id)&&(x.responsible_employee_id||x.responsible_name||x.due_date)).map(d=>({id:String(d.id),relationalId:d.id,title:d.title||'',owner:d.responsible_name||'',ownerEmployeeId:d.responsible_employee_id||'',dueDate:d.due_date||'',status:d.status||'Ανοικτή',completedAt:d.completed_at||'',agendaItemId:d.agenda_item_id||''}))
      return {...legacy,id:String(mt.id),relationalId:mt.id,date:mt.meeting_date||'',title:mt.title||'',presentIds:attendance.filter(a=>a.present).map(a=>a.employeeId?`employee-${a.employeeId}`:a.memberId),attendance,agendaItems:items,minutes:mt.notes||'',actions,attachments:Array.isArray(legacy.attachments)?legacy.attachments:[],status:mt.status||legacy.status||'Πρόχειρη',quorumOverrideReason:legacy.quorumOverrideReason||''}
    }):row.meetings
    return {...row,memberIds:members.map(m=>m.employeeId).filter(Boolean),members,meetings}
  })
}

async function syncCommitteeRelations(c,{org,actor,row,staffMap}){
  const members=Array.isArray(row.members)?row.members:[]
  const {data:existingMembers,error:memberReadError}=await c.from('committee_members').select('*').eq('organization_id',org).eq('committee_id',String(row.id));if(memberReadError)throw memberReadError
  const activeKeys=new Set()
  for(const member of members){
    const employeeId=String(member.employeeId||'').trim()||null
    const existing=(existingMembers||[]).find(x=>employeeId?String(x.employee_id||'')===employeeId:(!x.employee_id&&String(x.full_name||'').trim().toLocaleLowerCase('el-GR')===String(member.fullName||'').trim().toLocaleLowerCase('el-GR')))
    const staff=employeeId?staffMap.get(employeeId):null
    const department=one(staff?.department)
    const memberPayload={organization_id:org,committee_id:String(row.id),employee_id:employeeId,full_name:String(member.fullName||''),role:String(member.role||'Μέλος'),duties:String(member.duties||''),professional_category:String(member.capacity||''),department_id:staff?.department_id||member.departmentId||null,department_name:String(department?.name||member.department||''),is_manual:!!member.manual,is_active:true,end_date:null,created_by:existing?.created_by||actor}
    let savedMember
    if(existing){const {data,error}=await c.from('committee_members').update(memberPayload).eq('id',existing.id).select().single();if(error)throw error;savedMember=data}else{const {data,error}=await c.from('committee_members').insert(memberPayload).select().single();if(error)throw error;savedMember=data}
    activeKeys.add(String(savedMember.id));member.relationalId=savedMember.id
  }
  const stale=(existingMembers||[]).filter(x=>x.is_active&&!activeKeys.has(String(x.id)))
  for(const old of stale){const {error}=await c.from('committee_members').update({is_active:false,end_date:new Date().toISOString().slice(0,10)}).eq('id',old.id);if(error)throw error}

  const {data:existingMeetings,error:existingMeetingsError}=await c.from('committee_meetings').select('id,created_by').eq('committee_id',String(row.id));if(existingMeetingsError)throw existingMeetingsError
  const meetingCreator=new Map((existingMeetings||[]).map(x=>[String(x.id),x.created_by]))
  const {data:existingDecisions,error:existingDecisionsError}=await c.from('committee_decisions').select('id,created_by').eq('committee_id',String(row.id));if(existingDecisionsError)throw existingDecisionsError
  const decisionCreator=new Map((existingDecisions||[]).map(x=>[String(x.id),x.created_by]))
  for(const mt of row.meetings||[]){
    const meetingId=uuidOrNew(mt.relationalId||mt.id);mt.relationalId=meetingId;mt.id=meetingId
    const meetingPayload={id:meetingId,organization_id:org,committee_id:String(row.id),meeting_date:date(mt.date),location:String(mt.location||''),status:String(mt.status||'Πρόχειρη'),title:String(mt.title||''),notes:String(mt.minutes||''),created_by:meetingCreator.get(meetingId)||actor}
    const {error:meetingError}=await c.from('committee_meetings').upsert(meetingPayload,{onConflict:'id'});if(meetingError)throw meetingError
    const {error:attendeeDeleteError}=await c.from('committee_meeting_attendees').delete().eq('meeting_id',meetingId);if(attendeeDeleteError)throw attendeeDeleteError
    const memberRows=await c.from('committee_members').select('id,employee_id,full_name,role').eq('committee_id',String(row.id));if(memberRows.error)throw memberRows.error
    const memberLookup=new Map((memberRows.data||[]).map(x=>[String(x.employee_id||x.full_name||'').toLocaleLowerCase('el-GR'),x]))
    const attendance=(mt.attendance||[]).map(a=>{const key=String(a.employeeId||a.fullName||'').toLocaleLowerCase('el-GR'),cm=memberLookup.get(key);return {organization_id:org,meeting_id:meetingId,committee_member_id:cm?.id||null,employee_id:a.employeeId||cm?.employee_id||null,full_name:String(a.fullName||cm?.full_name||''),role:String(a.role||cm?.role||''),attendance_status:a.present?'Παρόν':'Απών',attendance_notes:String(a.attendanceNotes||'')}})
    if(attendance.length){const {error}=await c.from('committee_meeting_attendees').insert(attendance);if(error)throw error}
    const agendaIds=new Set()
    const agendaRelationMap=new Map()
    for(let i=0;i<(mt.agendaItems||[]).length;i++){
      const item=mt.agendaItems[i]
      const sourceAgendaId=String(item.id||item.relationalId||'')
      const agendaId=uuidOrNew(item.relationalId||item.id)
      item.relationalId=agendaId
      item.id=agendaId
      agendaIds.add(agendaId)
      if(sourceAgendaId)agendaRelationMap.set(sourceAgendaId,agendaId)
      agendaRelationMap.set(String(agendaId),agendaId)
      const {error}=await c.from('committee_agenda_items').upsert({id:agendaId,organization_id:org,meeting_id:meetingId,position:i+1,title:String(item.title||''),description:String(item.discussion||''),presenter:String(item.presenter||''),status:item.decision?'Αποφασίστηκε':'Συζητήθηκε'},{onConflict:'id'});if(error)throw error
      if(String(item.decision||'').trim()){
        const decisionId=uuidOrNew(item.decisionRelationalId);item.decisionRelationalId=decisionId
        const {error:dError}=await c.from('committee_decisions').upsert({id:decisionId,organization_id:org,committee_id:String(row.id),meeting_id:meetingId,agenda_item_id:agendaId,decision_date:date(mt.date)||new Date().toISOString().slice(0,10),title:String(item.title||''),decision_text:String(item.decision||''),status:'Ολοκληρωμένη',completed_at:new Date().toISOString(),created_by:decisionCreator.get(decisionId)||actor},{onConflict:'id'});if(dError)throw dError
      }
    }
    for(const action of mt.actions||[]){
      const decisionId=uuidOrNew(action.relationalId||action.id);action.relationalId=decisionId;action.id=decisionId
      const ownerMember=members.find(m=>String(m.fullName||'')===String(action.owner||''))
      const {error}=await c.from('committee_decisions').upsert({id:decisionId,organization_id:org,committee_id:String(row.id),meeting_id:meetingId,agenda_item_id:agendaRelationMap.get(String(action.agendaItemId||''))||null,decision_date:date(mt.date)||new Date().toISOString().slice(0,10),title:String(action.title||''),decision_text:String(action.title||''),responsible_employee_id:ownerMember?.employeeId||null,responsible_name:String(action.owner||''),due_date:date(action.dueDate),status:String(action.status||'Ανοιχτή'),completed_at:action.status==='Ολοκληρωμένη'?(action.completedAt||new Date().toISOString()):null,created_by:decisionCreator.get(decisionId)||actor},{onConflict:'id'});if(error)throw error
    }
  }
}

function ensureCommitteeRelationalIds(row){
  return {...row,meetings:(row.meetings||[]).map(mt=>({...mt,relationalId:uuidOrNew(mt.relationalId||mt.id),agendaItems:(mt.agendaItems||[]).map(item=>({...item,relationalId:uuidOrNew(item.relationalId||item.id),decisionRelationalId:item.decision?uuidOrNew(item.decisionRelationalId):item.decisionRelationalId})),actions:(mt.actions||[]).map(action=>({...action,relationalId:uuidOrNew(action.relationalId||action.id)}))}))}
}
function uuidOrNew(value){const s=String(value||'');return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)?s:crypto.randomUUID()}
async function actorId(c){const {data,error}=await c.auth.getUser();if(error)throw error;const id=data?.user?.id;if(!id)throw new Error('Authenticated user context not found.');return id}

function mapTraining(r){return {...r.data,id:r.id,title:r.title,category:r.category,department:one(r.department)?.name||'',trainer:r.trainer,date:r.training_date||'',status:r.status,durationHours:Number(r.duration_hours||0),validUntil:r.valid_until||'',attendance:Array.isArray(r.attendance)?r.attendance:[],attachments:Array.isArray(r.attachments)?r.attachments:[],notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at}}
function mapCommittee(r){return {...r.data,id:r.id,name:r.name,type:r.committee_type,chair:r.chair,secretary:r.secretary,lastMeeting:r.last_meeting||'',nextMeeting:r.next_meeting||'',status:r.status,frequency:r.frequency,memberIds:Array.isArray(r.member_ids)?r.member_ids:[],members:Array.isArray(r.members)?r.members:[],agenda:Array.isArray(r.agenda)?r.agenda:[],meetings:Array.isArray(r.meetings)?r.meetings:[],attachments:Array.isArray(r.attachments)?r.attachments:[],purpose:r.purpose,notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at}}
function mapDocument(r){return {...r.data,id:r.id,title:r.title,code:r.code,category:r.category,version:r.version,owner:r.owner,status:r.status,reviewDate:r.review_date||'',attachments:Array.isArray(r.attachments)?r.attachments:[],versions:Array.isArray(r.versions)?r.versions:[],createdAt:r.created_at,updatedAt:r.updated_at}}
async function orgId(c){const {data,error}=await c.rpc('current_organization_id');if(error)throw error;if(!data)throw new Error('Organization context not found.');return data}
async function departmentId(c,org,name){if(!name)return null;const {data,error}=await c.from('departments').select('id').eq('organization_id',org).eq('name',String(name)).limit(1);if(error)throw error;return data?.[0]?.id||null}
function date(v){const s=String(v||'').trim();if(!s)return null;if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);return m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:null}
function rest(o,keys){const x={...o};keys.forEach(k=>delete x[k]);return x}
function one(v){return Array.isArray(v)?v[0]:v}

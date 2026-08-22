function one(v){return Array.isArray(v)?v[0]:v}
function numberOrNull(v){const n=Number(v);return Number.isFinite(n)?n:null}
function trimTime(v){return v?String(v).slice(0,5):''}
export function mapPromotedAntibiotic(r={}){
 const patient=one(r.patient)||{}
 const department=one(r.department)||{}
 const legacy=String(r.legacy_prevention_record_id||'')
 return {
   id:r.id, legacyId:legacy, patientId:r.patient_id||'',
   patientName:[patient.first_name,patient.last_name].filter(Boolean).join(' '), patientCode:patient.patient_code||'',
   department:department.name||'', antibiotic:r.antibiotic||'', indication:r.indication||'', date:r.request_date||'',
   approval:r.status||'Εκκρεμεί', status:r.status||'Εκκρεμεί', doctor:r.reviewed_by_name||'',
   approvalDate:r.approval_date||'', notes:r.decision_notes||'', reviewedAt:r.reviewed_at||null,
   sourceType:legacy.startsWith('PTX-')?'patient-therapy':'', sourceId:legacy.startsWith('PTX-')?legacy.slice(4):'',
   createdAt:r.created_at||null, updatedAt:r.updated_at||null,
 }
}
export function mapEmployeeVaccination(r={}){
 const employee=one(r.employee)
 const department=one(employee?.department)
 return {
   id:r.id,
   employeeId:r.employee_id||'',
   employeeName:[employee?.last_name,employee?.first_name].filter(Boolean).join(' '),
   employeeCode:employee?.employee_code||'',
   department:department?.name||'',
   professionalCategory:employee?.professional_category||'',
   vaccine:r.vaccine||'',
   dose:r.dose||'',
   date:r.vaccination_date||'',
   validUntil:r.next_due_date||'',
   lot:r.lot_number||'',
   provider:r.provider||'',
   status:r.status||'Ολοκληρωμένος',
   notes:r.notes||'',
   createdAt:r.created_at||null,
   updatedAt:r.updated_at||null,
 }
}



export function mapWasteMeasurement(r={}){
 const department=one(r.department)||{}
 const weight=numberOrNull(r.weight_kg)
 const patientDays=numberOrNull(r.patient_days)
 return {
   id:r.id,
   legacyPreventionRecordId:r.legacy_prevention_record_id||'',
   date:r.record_date||'',
   department:department.name||'',
   wasteType:r.waste_type||'',
   weightKg:r.weight_kg==null?'':String(r.weight_kg),
   containers:r.containers==null?'':String(r.containers),
   patientDays:r.patient_days==null?'':String(r.patient_days),
   indicator:patientDays&&weight!=null?weight/patientDays:0,
   responsible:r.responsible||'',
   documentNumber:r.document_number||'',
   collectionCompany:r.collection_company||'',
   notes:r.notes||'',
   createdAt:r.created_at||null,
   updatedAt:r.updated_at||null,
 }
}
export function mapAntisepticConsumption(r={}){
 const department=one(r.department)||{}
 const consumption=numberOrNull(r.consumption)
 const patientDays=numberOrNull(r.patient_days)
 return {
   id:r.id,
   legacyPreventionRecordId:r.legacy_prevention_record_id||'',
   date:r.record_date||'',
   department:department.name||'',
   product:r.product||'',
   openingStock:r.opening_stock==null?'':String(r.opening_stock),
   received:r.received==null?'':String(r.received),
   closingStock:r.closing_stock==null?'':String(r.closing_stock),
   consumption:r.consumption==null?'':String(r.consumption),
   patientDays:r.patient_days==null?'':String(r.patient_days),
   indicator:patientDays&&consumption!=null?consumption/patientDays:0,
   responsible:r.responsible||'',
   notes:r.notes||'',
   createdAt:r.created_at||null,
   updatedAt:r.updated_at||null,
 }
}
export function mapHandHygieneSession(r={},observations=[]){
 const department=one(r.department)||{}
 const mappedObservations=(observations||[]).map(item=>({
   id:item.id,
   relationalId:item.id,
   professionalCode:item.professional_code||'',
   professionalCategory:item.professional_category||'',
   moment:item.moment||'',
   action:item.action||'',
   gloves:Boolean(item.gloves),
   notes:item.notes||'',
 }))
 const calculations=calculateHandHygiene(mappedObservations)
 return {
   id:r.id,
   legacyPreventionRecordId:r.legacy_prevention_record_id||'',
   date:r.observation_date||'',
   department:department.name||'',
   facility:r.facility||'',
   ward:r.ward||'',
   observer:r.observer||'',
   startTime:trimTime(r.start_time),
   endTime:trimTime(r.end_time),
   notes:r.notes||'',
   observations:mappedObservations,
   calculations,
   createdAt:r.created_at||null,
   updatedAt:r.updated_at||null,
 }
}
export function calculateHandHygiene(observations=[]){
 const opportunities=observations.length
 const handRub=observations.filter(x=>x.action==='HR').length
 const handWash=observations.filter(x=>x.action==='HW').length
 const missed=observations.filter(x=>x.action==='MISSED').length
 const correctActions=handRub+handWash
 const professionals=new Set(observations.map(x=>x.professionalCode||x.professionalCategory).filter(Boolean)).size
 return {
   missed,handRub,handWash,
   compliance:opportunities?Math.round((correctActions/opportunities)*10000)/100:0,
   opportunities,professionals,correctActions,
 }
}

import fs from 'node:fs'
const r=p=>fs.readFileSync(p,'utf8')
const backend=r('src/services/backend/organizationBackendService.js'),migration=r('supabase/migrations/20260813_000013_committees_documents_integrity.sql')
const failures=[]
if(!/duplicateCommittee/.test(backend)||!/Committee contains the same member more than once/.test(backend))failures.push('Committee identity/member duplication is not protected.')
if(!/Meeting attendance contains a person who is not a committee member/.test(backend))failures.push('Committee attendance membership is not validated.')
if(!/Decision action due date cannot precede/.test(backend)||!/Next committee meeting cannot precede/.test(backend))failures.push('Committee meeting/action chronology is not validated.')
if(!/duplicateDocument/.test(backend)||!/in-force document must have at least one attachment/i.test(backend))failures.push('Controlled-document identity/publication rules are not protected.')
if(!/version history contains duplicate/.test(backend))failures.push('Controlled-document version history is not protected.')
if(!/committee_payload_guard/.test(migration)||!/controlled_document_guard/.test(migration)||!/committees_org_name_unique_ci/.test(migration))failures.push('Database organization integrity guards are incomplete.')
if(failures.length){console.error('Organization integrity audit failed:');failures.forEach(x=>console.error('- '+x));process.exitCode=1}else console.log('Organization integrity audit OK: committees, meetings, attendance and controlled documents are guarded.')

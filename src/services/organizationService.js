import { APP_EVENTS, emitAppEvent } from '../core/events'
import { organizationRepository } from '../repositories/organizationRepository'
const TRAINING_KEY='limoxis:organization:training:v2'
const COMMITTEES_KEY='limoxis:organization:committees:v2'
const DOCUMENTS_KEY='limoxis:organization:documents:v1'
export const ORGANIZATION_EVENT = APP_EVENTS.ORGANIZATION_UPDATED
const today=()=>new Date().toISOString().slice(0,10)
const addDays=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
export const addInterval=(date,frequency)=>{if(!date)return'';const d=new Date(`${date}T12:00:00`);const months={Μηνιαία:1,Διμηνιαία:2,Τριμηνιαία:3,Εξαμηνιαία:6,Ετήσια:12}[frequency]||0;if(!months)return date;d.setMonth(d.getMonth()+months);return d.toISOString().slice(0,10)}
const seedTraining=[
 {id:'tr-1',title:'Υγιεινή Χεριών – WHO',category:'Κλινική εκπαίδευση',department:'ΜΕΘ',trainer:'Επιτροπή Λοιμώξεων',date:addDays(5),status:'Προγραμματισμένη',durationHours:2,validUntil:addDays(370),attendance:[],attachments:[],notes:''},
 {id:'tr-2',title:'Διαχείριση αιχμηρών αντικειμένων',category:'Ασφάλεια',department:'Χειρουργείο',trainer:'Νοσηλευτική Διεύθυνση',date:addDays(-20),status:'Ολοκληρωμένη',durationHours:1,validUntil:addDays(345),attendance:[],attachments:[],notes:''},
]
const seedCommittees=[
 {id:'cm-1',name:'Επιτροπή Νοσοκομειακών Λοιμώξεων',type:'Επιτροπή',chair:'Πρόεδρος ΕΝΛ',secretary:'',lastMeeting:today(),nextMeeting:addDays(8),status:'Ενεργή',frequency:'Μηνιαία',memberIds:[],members:[],agenda:[],meetings:[],attachments:[],purpose:'',notes:''},
 {id:'cm-2',name:'ΟΕΚΟΧΑ',type:'Ομάδα εργασίας',chair:'Υπεύθυνος ΟΕΚΟΧΑ',secretary:'',lastMeeting:today(),nextMeeting:addDays(15),status:'Ενεργή',frequency:'Τριμηνιαία',memberIds:[],members:[],agenda:[],meetings:[],attachments:[],purpose:'',notes:''},
]
const seedDocuments=[
 {id:'dc-1',title:'Πολιτική Υγιεινής Χεριών',code:'Π.ΛΟΙΜ.001',category:'Πολιτική',version:'5.0',owner:'Επιτροπή Λοιμώξεων',status:'Σε ισχύ',reviewDate:addDays(65),updatedAt:today()},
 {id:'dc-2',title:'Διαχείριση έκθεσης σε βιολογικό παράγοντα',code:'Δ.ΑΣΦ.014',category:'Διαδικασία',version:'3.0',owner:'Νοσηλευτική Διεύθυνση',status:'Προς αναθεώρηση',reviewDate:addDays(12),updatedAt:addDays(-40)},
]

function saveCollection(replace, rows){const next=replace(Array.isArray(rows)?rows:[]);emitAppEvent(ORGANIZATION_EVENT,next);return next}
function upsert(rows,row,save){const item={...row,id:row.id||`${Date.now()}-${Math.random().toString(36).slice(2,7)}`};const i=rows.findIndex(x=>x.id===item.id);const next=i>=0?rows.map((x,index)=>index===i?item:x):[item,...rows];save(next);return item}
export const loadTraining=()=>organizationRepository.findTraining(seedTraining).map(x=>({...x,attendance:x.attendance||[],attachments:x.attachments||[],durationHours:x.durationHours||0}))
export const upsertTraining=(row)=>upsert(loadTraining(),row,(rows)=>saveCollection(organizationRepository.replaceTraining,rows))
export const deleteTraining=(id)=>saveCollection(organizationRepository.replaceTraining,loadTraining().filter(x=>x.id!==id))
export const loadCommittees=()=>organizationRepository.findCommittees(seedCommittees).map(x=>({...x,memberIds:x.memberIds||[],members:x.members||[],agenda:x.agenda||[],meetings:(x.meetings||[]).map(m=>({...m,presentIds:m.presentIds||[],actions:m.actions||[],attachments:m.attachments||[]})),attachments:x.attachments||[]}))
export const upsertCommittee=(row)=>upsert(loadCommittees(),row,(rows)=>saveCollection(organizationRepository.replaceCommittees,rows))
export const deleteCommittee=(id)=>saveCollection(organizationRepository.replaceCommittees,loadCommittees().filter(x=>x.id!==id))
export const loadDocuments=()=>organizationRepository.findDocuments(seedDocuments).map((item)=>{const legacyAttachment=item.fileData?{id:`legacy-${item.id}`,name:item.fileName||'Αρχείο',type:item.fileType||'application/octet-stream',size:0,data:item.fileData,uploadedAt:item.updatedAt||today()}:null;const attachments=Array.isArray(item.attachments)?item.attachments:(legacyAttachment?[legacyAttachment]:[]);const {fileName,fileType,fileData,...clean}=item;return {...clean,attachments}})
export const upsertDocument=(row)=>upsert(loadDocuments(),row,(rows)=>saveCollection(organizationRepository.replaceDocuments,rows))
export const deleteDocument=(id)=>saveCollection(organizationRepository.replaceDocuments,loadDocuments().filter(x=>x.id!==id))

export const replaceTrainingCollection=(rows=[])=>saveCollection(organizationRepository.replaceTraining,rows)
export const replaceCommitteesCollection=(rows=[])=>saveCollection(organizationRepository.replaceCommittees,rows)
export const replaceDocumentsCollection=(rows=[])=>saveCollection(organizationRepository.replaceDocuments,rows)

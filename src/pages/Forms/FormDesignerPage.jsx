import { APP_ROUTES } from '../../config/routes'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { useNavigate } from 'react-router-dom'
import { Archive, ClipboardList, Copy, Plus, Save, Trash2, X } from 'lucide-react'
import { FORM_TEMPLATES_EVENT, loadFormTemplates } from '../../services/formTemplatesService'
import { hydrateFormsBackend, saveFormTemplateBackend } from '../../services/backend/configurationBackendService'
import { BackLink, Button, IconButton, PageChrome } from '../../components/core'
import PageHeader from '../../components/core/PageHeader/PageHeader'
import { normalizeText } from '../../core/utils/entityList'
import { useI18n } from '../../i18n'
import './FormDesignerPage.css'

const emptyTemplate=()=>({id:'',name:'',type:'checklist',category:'',description:'',status:'active',appliesTo:[{module:'bundles',context:''}],scoring:{enabled:true,excludeNA:true},questions:[]})
const emptyQuestion=()=>({id:`q-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,label:'',type:'yes-no-na',required:false,scored:true,options:[]})
const TYPE_EN={bundle:'Bundle',checklist:'Checklist',questionnaire:'Questionnaire',audit:'Audit',inspection:'Inspection'}
const MODULE_EN={bundles:'Bundles & Checklists','patient-cultures':'Patient cultures','staff-cultures':'Staff cultures',environment:'Environment',water:'Water',audits:'Audit Center'}
const QUESTION_EN={'yes-no-na':'Yes / No / N/A','yes-no':'Yes / No',text:'Text',textarea:'Observation',number:'Number',date:'Date',select:'Dropdown'}

export default function FormDesignerPage(){
 const {language}=useI18n();const L=(el,en)=>language==='en'?en:el
 const navigate=useNavigate()
 const [templates,setTemplates]=useState(loadFormTemplates)
 const [draft,setDraft]=useState(null)
 const [query,setQuery]=useState('')
 useAppEvents(FORM_TEMPLATES_EVENT,()=>setTemplates(loadFormTemplates()))
 useEffect(()=>{let active=true;hydrateFormsBackend().then(data=>{if(active)setTemplates(data.templates||[])}).catch(()=>{});return()=>{active=false}},[])
 const filtered=useMemo(()=>templates.filter(item=>normalizeText(`${item.name} ${item.category} ${item.type}`).includes(normalizeText(query))),[templates,query])

 async function save(){
   if(!draft?.name?.trim()){notifyAction(L('Συμπληρώστε όνομα φόρμας.','Enter a form name.'));return}
   const duplicate=templates.find(item=>item.id!==draft.id&&normalizeText(item.name)===normalizeText(draft.name))
   if(duplicate){notifyAction(L('Υπάρχει ήδη φόρμα με το ίδιο όνομα.','A form with the same name already exists.'));return}
   const questions=draft.questions.filter(q=>q.label.trim())
   if(!questions.length){notifyAction(L('Προσθέστε τουλάχιστον μία ερώτηση.','Add at least one question.'));return}
   await saveFormTemplateBackend({...draft,questions})
   setTemplates((await hydrateFormsBackend()).templates)
   notifyAction(draft.id?L('Η φόρμα ενημερώθηκε.','Form updated.'):L('Η φόρμα δημιουργήθηκε.','Form created.'))
   setDraft(null)
 }
 const addQuestion=()=>setDraft(current=>({...current,questions:[...current.questions,emptyQuestion()]}))
 const updateQuestion=(id,patch)=>setDraft(current=>({...current,questions:current.questions.map(q=>q.id===id?{...q,...patch}:q)}))
 const removeQuestion=id=>setDraft(current=>({...current,questions:current.questions.filter(q=>q.id!==id)}))

 return <PageChrome
   className="form-designer-page"
   back={<BackLink onClick={()=>navigate(APP_ROUTES.STUDIO)}>{L('Πίσω στο Κέντρο Διαχείρισης','Back to Management Center')}</BackLink>}
   header={<PageHeader eyebrow={L('ΚΕΝΤΡΙΚΟΣ ΜΗΧΑΝΙΣΜΟΣ','CENTRAL ENGINE')} title="Form Designer" description={L('Δημιουργήστε bundles, checklists και ερωτηματολόγια που μπορούν να φορτώνονται δυναμικά στις συνδεδεμένες ενότητες.','Create bundles, checklists and questionnaires that can load dynamically in connected modules.')} actions={<Button icon={<Plus size={18}/>} onClick={()=>setDraft(emptyTemplate())}>{L('Νέα φόρμα','New form')}</Button>}/>}
 >
   <section className="fd-toolbar"><input placeholder={L('Αναζήτηση φόρμας…','Search forms…')} value={query} onChange={e=>setQuery(e.target.value)}/><strong>{filtered.length} {L('φόρμες','forms')}</strong></section>
   <section className="fd-grid">{filtered.map(template=><article className="fd-card fd-card--clickable" key={template.id} role="button" tabIndex={0} onClick={()=>setDraft(JSON.parse(JSON.stringify(template)))} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setDraft(JSON.parse(JSON.stringify(template)))}}}>
     <div className="fd-card-icon"><ClipboardList size={22}/></div>
     <div className="fd-card-main"><div className="fd-card-meta"><span>{language==='en'?(TYPE_EN[template.type]||template.type):template.type}</span><span>{template.status==='active'?L('Ενεργή','Active'):L('Ανενεργή','Inactive')}</span></div><h3>{template.name}</h3><p>{template.description||L('Χωρίς περιγραφή','No description')}</p><footer><span>{template.questions.length} {L('ερωτήσεις','questions')}</span><span>{template.appliesTo?.map(x=>`${language==='en'?(MODULE_EN[x.module]||x.module):x.module}${x.context?` / ${x.context}`:''}`).join(', ')||L('Χωρίς σύνδεση','Not linked')}</span></footer></div>
     <div className="fd-card-actions"><Button size="sm" variant="secondary" onClick={event=>{event.stopPropagation();setDraft(JSON.parse(JSON.stringify(template)))}}>{L('Επεξεργασία','Edit')}</Button><IconButton size="sm" label={L('Αντιγραφή','Duplicate')} onClick={event=>{event.stopPropagation();setDraft({...JSON.parse(JSON.stringify(template)),id:'',name:`${template.name} – ${L('Αντίγραφο','Copy')}`})}}><Copy size={16}/></IconButton><IconButton size="sm" variant="secondary" label={template.status==='active'?L('Απενεργοποίηση','Deactivate'):L('Ενεργοποίηση','Activate')} onClick={async event=>{event.stopPropagation();const nextStatus=template.status==='active'?'inactive':'active';if(nextStatus==='inactive'&&!confirmAction(L('Να γίνει η φόρμα ανενεργή; Οι παλιές απαντήσεις θα παραμείνουν διαθέσιμες.','Deactivate this form? Existing responses will remain available.')))return;await saveFormTemplateBackend({...template,status:nextStatus});setTemplates((await hydrateFormsBackend()).templates);notifyAction(nextStatus==='active'?L('Η φόρμα ενεργοποιήθηκε.','Form activated.'):L('Η φόρμα απενεργοποιήθηκε.','Form deactivated.'))}}><Archive size={16}/></IconButton></div>
   </article>)}</section>

   {draft&&<div className="fd-modal-backdrop"><div className="fd-modal">
    <header><div><span>{draft.id?L('ΕΠΕΞΕΡΓΑΣΙΑ','EDIT'):L('ΝΕΑ ΦΟΡΜΑ','NEW FORM')}</span><h2>{draft.name||L('Χωρίς τίτλο','Untitled')}</h2></div><IconButton variant="ghost" label={L('Κλείσιμο','Close')} onClick={()=>setDraft(null)}><X/></IconButton></header>
    <div className="fd-modal-body">
     <section className="fd-section"><h3>{L('Βασικά στοιχεία','Basic details')}</h3><div className="fd-form-grid">
      <label>{L('Όνομα','Name')}<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <label>{L('Τύπος','Type')}<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}><option value="bundle">Bundle</option><option value="checklist">Checklist</option><option value="questionnaire">{L('Ερωτηματολόγιο','Questionnaire')}</option><option value="audit">Audit</option><option value="inspection">{L('Επιθεώρηση','Inspection')}</option></select></label>
      <label>{L('Κατηγορία','Category')}<input value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})}/></label>
      <label>{L('Κατάσταση','Status')}<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="active">{L('Ενεργή','Active')}</option><option value="inactive">{L('Ανενεργή','Inactive')}</option></select></label>
      <label className="wide">{L('Περιγραφή','Description')}<textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
     </div></section>

     <section className="fd-section"><h3>{L('Σύνδεση με ενότητα','Module connection')}</h3><div className="fd-form-grid">
      <label>{L('Ενότητα','Module')}<select value={draft.appliesTo?.[0]?.module||''} onChange={e=>setDraft({...draft,appliesTo:[{...draft.appliesTo?.[0],module:e.target.value}]})}><option value="bundles">Bundles & Checklists</option><option value="patient-cultures">{L('Καλλιέργειες ασθενών','Patient cultures')}</option><option value="staff-cultures">{L('Καλλιέργειες προσωπικού','Staff cultures')}</option><option value="environment">{L('Περιβάλλον','Environment')}</option><option value="water">{L('Νερό','Water')}</option><option value="audits">Audit Center</option></select></label>
      <label>{L('Πλαίσιο / τύπος','Context / type')}<input placeholder={L('π.χ. Ουροκαλλιέργεια ή *','e.g. Urine culture or *')} value={draft.appliesTo?.[0]?.context||''} onChange={e=>setDraft({...draft,appliesTo:[{...draft.appliesTo?.[0],context:e.target.value}]})}/></label>
     </div></section>

     <section className="fd-section"><div className="fd-section-title"><div><h3>{L('Ερωτήσεις','Questions')}</h3><p>{L('Οι ερωτήσεις εμφανίζονται με τη σειρά που καταχωρούνται.','Questions appear in the order entered.')}</p></div><Button icon={<Plus size={16}/>} onClick={addQuestion}>{L('Προσθήκη ερώτησης','Add question')}</Button></div>
      <div className="fd-questions">{draft.questions.map((q,index)=><div className="fd-question" key={q.id}><span className="fd-question-index">{index+1}</span><input className="fd-question-label" placeholder={L('Κείμενο ερώτησης','Question text')} value={q.label} onChange={e=>updateQuestion(q.id,{label:e.target.value})}/><select value={q.type} onChange={e=>updateQuestion(q.id,{type:e.target.value,scored:['yes-no','yes-no-na'].includes(e.target.value)})}><option value="yes-no-na">{L('Ναι / Όχι / N/A','Yes / No / N/A')}</option><option value="yes-no">{L('Ναι / Όχι','Yes / No')}</option><option value="text">{L('Κείμενο','Text')}</option><option value="textarea">{L('Παρατήρηση','Observation')}</option><option value="number">{L('Αριθμός','Number')}</option><option value="date">{L('Ημερομηνία','Date')}</option><option value="select">Dropdown</option></select><label><input type="checkbox" checked={q.required} onChange={e=>updateQuestion(q.id,{required:e.target.checked})}/>{L('Υποχρεωτική','Required')}</label><IconButton size="sm" variant="danger" label={L('Αφαίρεση ερώτησης','Remove question')} onClick={()=>removeQuestion(q.id)}><Trash2 size={15}/></IconButton></div>)}</div>
     </section>
    </div>
    <footer><Button variant="secondary" onClick={()=>setDraft(null)}>{L('Ακύρωση','Cancel')}</Button><Button icon={<Save size={17}/>} onClick={save}>{L('Αποθήκευση φόρμας','Save form')}</Button></footer>
   </div></div>}
 </PageChrome>
}

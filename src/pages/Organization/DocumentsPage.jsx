import { formatDate } from '../../core/utils/dateTime'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { AlertCircle, Archive, Trash2, CheckCircle2, ChevronDown, ChevronUp, Copy, Download, FileCheck2, Files, Plus, Printer, RefreshCw, Send } from 'lucide-react'
import {
  Badge, Button, DateRangeFilter, Drawer, EntityCell, EntitySummary, FormActions, FormField, FormGrid, FormSection,
  LibraryField, ListWorkspace, PageChrome, PageHeader, StatCard,
} from '../../components/core'
import AttachmentManager from '../../components/core/AttachmentManager/AttachmentManager'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { loadDocuments, ORGANIZATION_EVENT } from '../../services/organizationService'
import { deleteOperationalDocument, loadOperationalDocuments, saveOperationalDocument } from '../../services/backend/organizationBackendService'
import { useRecordDeepLink } from '../../core/navigation/recordDeepLink'
import { useI18n } from '../../i18n'
import { loadCurrentProfile } from '../../services/profile/profileService'
import './OrganizationUnified.css'

const EMPTY={id:'',title:'',code:'',category:'Πολιτική',version:'1.0',owner:'',reviewDate:'',reviewCycleMonths:12,status:'Πρόχειρο',description:'',scope:'',keywords:'',attachments:[],versions:[],preparedBy:'',submittedBy:'',submittedAt:'',reviewedBy:'',reviewedAt:'',approvedBy:'',approvedAt:'',effectiveDate:'',retiredAt:''}
const STATUSES=['Πρόχειρο','Προς έγκριση','Σε ισχύ','Προς αναθεώρηση','Καταργημένο']
const CATEGORIES=['Πολιτική','Διαδικασία','Οδηγία','Πρωτόκολλο','Έντυπο','Κανονισμός','Άλλο']
const STATUS_EN={'Σε ισχύ':'In force','Προς έγκριση':'Pending approval','Προς αναθεώρηση':'Due for review','Πρόχειρο':'Draft','Καταργημένο':'Retired'}
const CATEGORY_EN={'Πολιτική':'Policy','Διαδικασία':'Procedure','Οδηγία':'Guideline','Πρωτόκολλο':'Protocol','Έντυπο':'Form','Κανονισμός':'Regulation','Άλλο':'Other'}

function addMonths(dateString,months){
 const base=dateString?new Date(`${dateString}T12:00:00`):new Date()
 if(Number.isNaN(base.getTime()))return''
 base.setMonth(base.getMonth()+Math.max(1,Number(months)||12))
 return base.toISOString().slice(0,10)
}

export default function DocumentsPage(){
 const { language }=useI18n()
 const L=(el,en)=>language==='en'?en:el
 const V=value=>language==='en'?(STATUS_EN[value]||CATEGORY_EN[value]||value):value
 const displayDate=value=>formatDate(value,language)
 const [rows,setRows]=useState(loadDocuments); useEffect(()=>{loadOperationalDocuments().then(setRows).catch(()=>{})},[])
 const [search,setSearch]=useState(''); const [status,setStatus]=useState(''); const [category,setCategory]=useState(''); const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sort,setSort]=useState({key:'title',direction:'asc'}); const [selectedKeys,setSelectedKeys]=useState([])
 const [open,setOpen]=useState(false); const [editing,setEditing]=useState(null); const [form,setForm]=useState(EMPTY); const [expandedVersion,setExpandedVersion]=useState('')
 const notificationLink=useRecordDeepLink(rows)
 useAppEvents(ORGANIZATION_EVENT,()=>{loadOperationalDocuments().then(setRows).catch(()=>{})})
 const today=new Date().toISOString().slice(0,10)
 const in30=new Date(Date.now()+30*86400000).toISOString().slice(0,10)
 const effectiveStatus=row=>row.status==='Σε ισχύ'&&row.reviewDate&&row.reviewDate<today?'Προς αναθεώρηση':row.status
 const categories=useMemo(()=>[...new Set([...CATEGORIES,...uniqueSortedValues(rows,r=>r.category)])],[rows])
 const filtered=useMemo(()=>{
   const q=normalizeText(search)
   return sortRows(rows.filter(r=>{
     const state=effectiveStatus(r)
     return (!status||state===status)&&(!category||r.category===category)&&(!from||!r.reviewDate||r.reviewDate>=from)&&(!to||!r.reviewDate||r.reviewDate<=to)&&(!q||normalizeText([r.title,r.code,r.owner,r.category,r.description,r.scope,r.keywords].filter(Boolean).join(' ')).includes(q))
   }),sort)
 },[rows,search,status,category,from,to,sort,today])
 const selected=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
 const metrics=useMemo(()=>({
   total:filtered.length,
   active:filtered.filter(r=>r.status==='Σε ισχύ').length,
   review:filtered.filter(r=>r.status==='Προς αναθεώρηση'||(r.status==='Σε ισχύ'&&r.reviewDate&&r.reviewDate<=in30)).length,
   files:filtered.reduce((n,r)=>n+(r.attachments||[]).length,0),
 }),[filtered,in30])
 const profile=useMemo(()=>loadCurrentProfile(language),[language])
 const actor=profile?.displayName||profile?.username||L('Χρήστης','User')
 const isLocked=Boolean(editing && editing.status==='Σε ισχύ' && form.status==='Σε ισχύ')
 const setField=(name,value)=>setForm(c=>({...c,[name]:value}))
 const exportColumns=[
   {label:L('Έγγραφο','Document'),value:r=>r.title||''},{label:L('Κωδικός','Code'),value:r=>r.code||''},
   {label:L('Κατηγορία','Category'),value:r=>V(r.category)||''},{label:L('Έκδοση','Version'),value:r=>r.version||''},
   {label:L('Ιδιοκτήτης','Owner'),value:r=>r.owner||''},{label:L('Αναθεώρηση','Review'),value:r=>r.reviewDate||''},
   {label:L('Κατάσταση','Status'),value:r=>V(effectiveStatus(r))||''},
 ]

 function openNew(){setEditing(null);setForm(EMPTY);setExpandedVersion('');setOpen(true)}
 function openRecord(row){notificationLink.markOpened(row.id);setEditing(row);setForm({...EMPTY,...row,attachments:row.attachments||[],versions:row.versions||[]});setExpandedVersion('');setOpen(true)}
 function close(){notificationLink.completeReview();setOpen(false);setEditing(null);setForm(EMPTY);setExpandedVersion('')}
 async function save(e){
   e.preventDefault()
   if(!form.title.trim()){notifyAction(L('Ο τίτλος είναι υποχρεωτικός.','Title is required.'));return}
   if(!form.code.trim()){notifyAction(L('Ο κωδικός εγγράφου είναι υποχρεωτικός.','Document code is required.'));return}
   const duplicate=rows.find(row=>row.id!==editing?.id&&normalizeText(row.code)===normalizeText(form.code))
   if(duplicate){notifyAction(L('Υπάρχει ήδη έγγραφο με τον ίδιο κωδικό.','A document with the same code already exists.'));return}
   if(form.status==='Σε ισχύ'&&!(form.attachments||[]).length){notifyAction(L('Για να τεθεί έγγραφο «Σε ισχύ» πρέπει να υπάρχει τουλάχιστον ένα αρχείο.','An in-force document must have at least one attached file.'));return}
   if(isLocked){notifyAction(L('Η εγκεκριμένη έκδοση είναι κλειδωμένη. Δημιουργήστε νέα έκδοση για αλλαγές.','The approved version is locked. Create a new version to make changes.'));return}
   try{
     await saveOperationalDocument({...form,id:editing?.id||form.id,preparedBy:form.preparedBy||actor,updatedAt:today})
     setRows(await loadOperationalDocuments())
     notifyAction(editing?L('Το έγγραφο ενημερώθηκε.','Document updated.'):L('Το έγγραφο δημιουργήθηκε.','Document created.'))
     close()
   }catch(error){console.error('Document save failed',error);notifyAction(error?.message||L('Η αποθήκευση του εγγράφου απέτυχε.','Document could not be saved.'))}
 }

 async function transition(next){
   if(!editing)return
   let patch={...form,status:next}
   if(next==='Προς έγκριση'){
     if(!(form.attachments||[]).length){notifyAction(L('Προσθέστε το έγγραφο πριν σταλεί για έγκριση.','Attach the document before sending it for approval.'));return}
     if(!form.code.trim()){notifyAction(L('Συμπληρώστε κωδικό εγγράφου πριν την έγκριση.','Enter a document code before approval.'));return}
     patch={...patch,preparedBy:form.preparedBy||actor,submittedBy:actor,submittedAt:new Date().toISOString()}
   }
   if(next==='Σε ισχύ'){
     if(!(form.attachments||[]).length){notifyAction(L('Δεν μπορεί να εγκριθεί χωρίς αρχείο.','A document cannot be approved without a file.'));return}
     const preparer=String(form.preparedBy||'').trim()
     const submitter=String(form.submittedBy||'').trim()
     if(actor && (actor===preparer || actor===submitter)){
       notifyAction(L('Η έγκριση απαιτεί διαφορετικό χρήστη από τον συντάκτη/υποβάλλοντα (διαχωρισμός καθηκόντων).','Approval requires a different user from the preparer/submitter (segregation of duties).'))
       return
     }
     const effectiveDate=form.effectiveDate||today
     const reviewDate=form.reviewDate||addMonths(effectiveDate,form.reviewCycleMonths)
     patch={...patch,reviewedBy:actor,reviewedAt:new Date().toISOString(),approvedBy:actor,approvedAt:new Date().toISOString(),effectiveDate,reviewDate}
   }
   if(next==='Καταργημένο')patch={...patch,retiredAt:new Date().toISOString()}
   try{await saveOperationalDocument(patch);setRows(await loadOperationalDocuments());setForm(patch);setEditing(patch);notifyAction(L('Η κατάσταση του εγγράφου ενημερώθηκε.','Document status updated.'))}catch(error){console.error(error);notifyAction(L('Η ενέργεια δεν ολοκληρώθηκε.','Action could not be completed.'))}
 }
 async function createRevision(){
   if(!editing)return
   const current=String(editing.version||'1.0').split('.').map(Number); const next=`${Number.isFinite(current[0])?current[0]:1}.${(Number.isFinite(current[1])?current[1]:0)+1}`
   const draft={...editing,version:next,status:'Πρόχειρο',versions:editing.versions||[],submittedBy:'',submittedAt:'',reviewedBy:'',reviewedAt:'',approvedBy:'',approvedAt:'',effectiveDate:'',retiredAt:'',preparedBy:actor}
   try{await saveOperationalDocument(draft);setRows(await loadOperationalDocuments());setEditing(draft);setForm(draft);notifyAction(L(`Δημιουργήθηκε η έκδοση ${next} ως πρόχειρο.`,`Version ${next} created as draft.`))}catch(error){console.error(error);notifyAction(L('Δεν δημιουργήθηκε νέα έκδοση.','New version could not be created.'))}
 }

 async function remove(){
   if(!editing||editing.status!=='Πρόχειρο'||!confirmAction(L('Να διαγραφεί το πρόχειρο έγγραφο;','Delete this draft document?')))return
   try{await deleteOperationalDocument(editing.id);setRows(await loadOperationalDocuments());notifyAction(L('Το έγγραφο διαγράφηκε.','Document deleted.'));close()}catch(error){console.error('Document delete failed',error);notifyAction(L('Η διαγραφή του εγγράφου απέτυχε.','Document could not be deleted.'))}
 }

 const columns=[
   {key:'title',label:L('Έγγραφο','Document'),sortable:true,render:r=><EntityCell primary={r.title} secondary={`${r.code||'—'} · ${L('Ενημέρωση','Updated')} ${displayDate(r.updatedAt)}`}/>},
   {key:'category',label:L('Κατηγορία','Category'),width:'135px',sortable:true,render:r=>V(r.category)},
   {key:'version',label:L('Έκδοση','Version'),width:'85px',sortable:true},
   {key:'owner',label:L('Υπεύθυνος','Owner'),sortable:true},
   {key:'reviewDate',label:L('Αναθεώρηση','Review'),width:'150px',sortable:true,render:r=><div className="org-document-review-cell"><span>{displayDate(r.reviewDate)}</span>{r.status==='Σε ισχύ'&&r.reviewDate&&r.reviewDate<=in30&&<small className={r.reviewDate<today?'is-overdue':'is-due'}>{r.reviewDate<today?L('Εκπρόθεσμη','Overdue'):L('Εντός 30 ημερών','Within 30 days')}</small>}</div>},
   {key:'attachments',label:L('Αρχεία','Files'),width:'75px',render:r=>(r.attachments||[]).length},
   {key:'status',label:L('Κατάσταση','Status'),width:'150px',render:r=>{const state=effectiveStatus(r);return <Badge tone={state==='Σε ισχύ'?'success':state==='Προς έγκριση'||state==='Προς αναθεώρηση'?'warning':state==='Καταργημένο'?'danger':'neutral'}>{V(state)}</Badge>}},
 ]

 const state=effectiveStatus(form)
 return <PageChrome className="organization-unified-page" header={<PageHeader
   title={L('Έγγραφα','Documents')}
   description={L('Ελεγχόμενα έγγραφα με κλειδωμένες εγκεκριμένες εκδόσεις, αναθεωρήσεις και πλήρες ιστορικό.','Controlled documents with locked approved versions, reviews and complete history.')}
   actions={<Button icon={<Plus size={17}/>} onClick={openNew}>{L('Νέο έγγραφο','New document')}</Button>}
 />}>
  <ListWorkspace
   stats={<EntitySummary columns={4}><StatCard compact icon={Files} label={L('Έγγραφα','Documents')} value={metrics.total}/><StatCard compact icon={FileCheck2} label={L('Σε ισχύ','In force')} value={metrics.active}/><StatCard compact icon={AlertCircle} label={L('Προς αναθεώρηση','Due for review')} value={metrics.review} tone={metrics.review?'warning':'default'}/><StatCard compact icon={RefreshCw} label={L('Αρχεία','Files')} value={metrics.files}/></EntitySummary>}
   searchValue={search} onSearchChange={setSearch} searchPlaceholder={L('Αναζήτηση τίτλου, κωδικού, υπευθύνου ή λέξης-κλειδιού…','Search title, code, owner or keyword…')} activeFilterCount={[search,status,category,from,to].filter(Boolean).length} onClearFilters={()=>{setSearch('');setStatus('');setCategory('');setFrom('');setTo('')}}
   filters={<><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">{L('Όλες οι κατηγορίες','All categories')}</option>{categories.map(x=><option key={x} value={x}>{V(x)}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">{L('Όλες οι καταστάσεις','All statuses')}</option>{STATUSES.map(x=><option key={x} value={x}>{V(x)}</option>)}</select><DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo}/></>}
   selectedCount={selected.length} selectedLabel={L('έγγραφα','documents')} onClearSelection={()=>setSelectedKeys([])}
   bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:L('Ελεγχόμενα Έγγραφα','Controlled Documents'),columns:exportColumns,rows:selected})}>{L('Εκτύπωση / PDF','Print / PDF')}</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:'documents.csv',columns:exportColumns,rows:selected})}>{L('Εξαγωγή CSV','Export CSV')}</Button></>}
   columns={columns} rows={filtered} getRowKey={r=>r.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel={L('Ελεγχόμενα έγγραφα','Controlled documents')} footer={<span>{filtered.length} {L('εγγραφές','records')}</span>} emptyTitle={L('Δεν υπάρχουν έγγραφα','No documents')} highlightedKey={notificationLink.highlightedId}
  />

  <Drawer open={open} onClose={close} title={editing?L('Καρτέλα εγγράφου','Document record'):L('Νέο έγγραφο','New document')} description={editing?`${form.code||'—'} · ${L('Έκδοση','Version')} ${form.version||'—'}`:L('Δημιουργία ελεγχόμενου εγγράφου.','Create a controlled document.')} width={1120} position="center" footer={<FormActions form="document-form" onCancel={close} disabled={isLocked} primaryLabel={isLocked?L('Κλειδωμένη έκδοση','Locked version'):undefined} destructive={editing?(editing.status==='Πρόχειρο'?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>{L('Διαγραφή','Delete')}</Button>:state!=='Καταργημένο'?<Button variant="danger" icon={<Archive size={16}/>} onClick={()=>transition('Καταργημένο')}>{L('Κατάργηση','Retire')}</Button>:null):null} extraActions={editing?<div className="org-inline-actions">{editing.status==='Πρόχειρο'&&<Button variant="secondary" icon={<Send size={16}/>} onClick={()=>transition('Προς έγκριση')}>{L('Προς έγκριση','Send for approval')}</Button>}{editing.status==='Προς έγκριση'&&<Button icon={<CheckCircle2 size={16}/>} onClick={()=>transition('Σε ισχύ')}>{L('Έγκριση & θέση σε ισχύ','Approve & publish')}</Button>}{(editing.status==='Σε ισχύ'||state==='Προς αναθεώρηση')&&<Button variant="secondary" icon={<Copy size={16}/>} onClick={createRevision}>{L('Νέα έκδοση','New version')}</Button>}</div>:null}/> }>
   <form id="document-form" className="organization-unified-form" onSubmit={save}>
    {editing&&<div className={`org-document-governance-banner status-${state==='Προς αναθεώρηση'?'review':state==='Σε ισχύ'?'active':'default'}`}><div><strong>{V(state)}</strong><span>{state==='Προς αναθεώρηση'?L('Η ημερομηνία αναθεώρησης έχει παρέλθει. Δημιουργήστε νέα έκδοση για αναθεώρηση.','The review date has passed. Create a new version for review.'):isLocked?L('Η εγκεκριμένη έκδοση είναι κλειδωμένη και παραμένει διαθέσιμη μόνο για προβολή.','The approved version is locked and remains view-only.'):L('Οι αλλαγές καταγράφονται στην τρέχουσα έκδοση μέχρι την έγκριση.','Changes are recorded in the current version until approval.')}</span></div><Badge tone={state==='Σε ισχύ'?'success':state==='Προς αναθεώρηση'||state==='Προς έγκριση'?'warning':state==='Καταργημένο'?'danger':'neutral'}>{V(state)}</Badge></div>}

    <FormSection title={L('Ταυτότητα εγγράφου','Document identity')}><FormGrid columns={2}>
     <FormField label={L('Τίτλος','Title')} required><input required disabled={isLocked} value={form.title} onChange={e=>setField('title',e.target.value)}/></FormField>
     <FormField label={L('Κωδικός','Code')} required><input required disabled={isLocked} value={form.code} onChange={e=>setField('code',e.target.value)} placeholder={L('π.χ. IC-POL-001','e.g. IC-POL-001')}/></FormField>
     <FormField label={L('Κατηγορία','Category')}><LibraryField hideLabel disabled={isLocked} libraryKey="document-categories" value={form.category} onChange={value=>setField('category',value)} placeholder={L('Επιλέξτε κατηγορία','Select category')}/></FormField>
     <FormField label={L('Ιδιοκτήτης / Υπεύθυνος','Owner / Responsible')}><input disabled={isLocked} value={form.owner} onChange={e=>setField('owner',e.target.value)}/></FormField>
     <FormField label={L('Έκδοση','Version')}><input disabled={isLocked} value={form.version} onChange={e=>setField('version',e.target.value)} placeholder={L('π.χ. 2.1','e.g. 2.1')}/></FormField>
     <FormField label={L('Κατάσταση','Status')}><div className="org-readonly-status"><Badge tone={state==='Σε ισχύ'?'success':state==='Προς έγκριση'||state==='Προς αναθεώρηση'?'warning':state==='Καταργημένο'?'danger':'neutral'}>{V(state)}</Badge></div></FormField>
     <FormField label={L('Κύκλος αναθεώρησης (μήνες)','Review cycle (months)')}><input type="number" min="1" max="60" disabled={isLocked} value={form.reviewCycleMonths||12} onChange={e=>setField('reviewCycleMonths',e.target.value)}/></FormField>
     <FormField label={L('Ημερομηνία αναθεώρησης','Review date')}><input type="date" disabled={isLocked} value={form.reviewDate||''} onChange={e=>setField('reviewDate',e.target.value)}/></FormField>
    </FormGrid>
    <FormField label={L('Περιγραφή / σκοπός','Description / purpose')}><textarea rows="3" disabled={isLocked} value={form.description||''} onChange={e=>setField('description',e.target.value)}/></FormField>
    <FormGrid columns={2}><FormField label={L('Πεδίο εφαρμογής','Scope')}><input disabled={isLocked} value={form.scope||''} onChange={e=>setField('scope',e.target.value)} placeholder={L('π.χ. Όλα τα κλινικά τμήματα','e.g. All clinical departments')}/></FormField><FormField label={L('Λέξεις-κλειδιά','Keywords')}><input disabled={isLocked} value={form.keywords||''} onChange={e=>setField('keywords',e.target.value)} placeholder={L('π.χ. απομόνωση, ΜΑΠ, MDR','e.g. isolation, PPE, MDR')}/></FormField></FormGrid>
    </FormSection>

    {editing&&<FormSection title={L('Έγκριση & ισχύς','Approval & validity')} description={L('Τα στοιχεία παράγονται από τις πραγματικές ενέργειες υποβολής και έγκρισης.','These details are generated by the actual submission and approval actions.')}><FormGrid columns={2}>
     <FormField label={L('Συντάχθηκε από','Prepared by')}><input readOnly value={form.preparedBy||'—'}/></FormField>
     <FormField label={L('Υποβλήθηκε από','Submitted by')}><input readOnly value={form.submittedBy||'—'}/></FormField>
     <FormField label={L('Ελέγχθηκε από','Reviewed by')}><input readOnly value={form.reviewedBy||'—'}/></FormField>
     <FormField label={L('Εγκρίθηκε από','Approved by')}><input readOnly value={form.approvedBy||'—'}/></FormField>
     <FormField label={L('Ημερομηνία ισχύος','Effective date')}><input readOnly value={form.effectiveDate?displayDate(form.effectiveDate):'—'}/></FormField>
     <FormField label={L('Επόμενη αναθεώρηση','Next review')}><input readOnly value={form.reviewDate?displayDate(form.reviewDate):'—'}/></FormField>
    </FormGrid></FormSection>}

    <FormSection title={L('Αρχεία','Files')} description={isLocked?L('Η εγκεκριμένη έκδοση είναι μόνο για προβολή. Για αλλαγή αρχείου δημιουργήστε νέα έκδοση.','The approved version is view-only. Create a new version to change files.'):undefined}><AttachmentManager value={form.attachments} readOnly={isLocked} onChange={isLocked?undefined:value=>setField('attachments',value)} hint={L('Κύριο έγγραφο, συνοδευτικά αρχεία ή παραρτήματα','Main document, supporting files or appendices')}/></FormSection>

    <FormSection title={`${L('Ιστορικό εκδόσεων','Version history')} (${(form.versions||[]).length})`} description={L('Οι εγκεκριμένες εκδόσεις παραμένουν κλειδωμένες μαζί με τα αρχεία και τα στοιχεία έγκρισής τους.','Approved versions remain locked together with their files and approval evidence.')}>
     <div className="org-stack-list">{(form.versions||[]).length?form.versions.map(v=><div className="org-document-version" key={v.id}><button type="button" className="org-document-version__summary" onClick={()=>setExpandedVersion(current=>current===v.id?'':v.id)}><div className="org-stack-row__main"><strong>{L('Έκδοση','Version')} {v.version}</strong><small>{displayDate(v.date)} · {V(v.status)||'—'} · {(v.attachments||[]).length} {L('αρχεία','files')}</small></div><span className="org-muted">{language==='en'&&v.note==='Εγκεκριμένη έκδοση'?'Approved version':v.note||''}</span>{expandedVersion===v.id?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button>{expandedVersion===v.id&&<div className="org-document-version__detail"><div className="org-document-version__meta"><span><strong>{L('Εγκρίθηκε από','Approved by')}:</strong> {v.approvedBy||'—'}</span><span><strong>{L('Ημερομηνία ισχύος','Effective date')}:</strong> {v.effectiveDate?displayDate(v.effectiveDate):'—'}</span><span><strong>{L('Αναθεώρηση','Review')}:</strong> {v.reviewDate?displayDate(v.reviewDate):'—'}</span></div><AttachmentManager value={v.attachments||[]} readOnly/></div>}</div>):<div className="org-empty">{L('Δεν υπάρχουν προηγούμενες εκδόσεις.','No previous versions.')}</div>}</div>
    </FormSection>
   </form>
  </Drawer>
 </PageChrome>
}

import { formatDate } from '../../core/utils/dateTime'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { AlertCircle, Download, FileCheck2, Files, Plus, Printer, RefreshCw, Trash2 } from 'lucide-react'
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
import './OrganizationUnified.css'

const EMPTY={id:'',title:'',code:'',category:'Πολιτική',version:'1.0',owner:'',reviewDate:'',status:'Πρόχειρο',description:'',attachments:[],versions:[]}
const STATUSES=['Σε ισχύ','Προς αναθεώρηση','Πρόχειρο','Καταργημένο']
const CATEGORIES=['Πολιτική','Διαδικασία','Οδηγία','Πρωτόκολλο','Έντυπο','Κανονισμός','Άλλο']
const STATUS_EN={'Σε ισχύ':'In force','Προς αναθεώρηση':'Due for review','Πρόχειρο':'Draft','Καταργημένο':'Retired'}
const CATEGORY_EN={'Πολιτική':'Policy','Διαδικασία':'Procedure','Οδηγία':'Guideline','Πρωτόκολλο':'Protocol','Έντυπο':'Form','Κανονισμός':'Regulation','Άλλο':'Other'}

export default function DocumentsPage(){
 const { language }=useI18n()
 const L=(el,en)=>language==='en'?en:el
 const V=value=>language==='en'?(STATUS_EN[value]||CATEGORY_EN[value]||value):value
 const displayDate=value=>formatDate(value,language)
 const [rows,setRows]=useState(loadDocuments); useEffect(()=>{loadOperationalDocuments().then(setRows).catch(()=>{})},[]); const [search,setSearch]=useState(''); const [status,setStatus]=useState(''); const [category,setCategory]=useState(''); const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sort,setSort]=useState({key:'title',direction:'asc'}); const [selectedKeys,setSelectedKeys]=useState([])
 const [open,setOpen]=useState(false); const [editing,setEditing]=useState(null); const [form,setForm]=useState(EMPTY)
 const notificationLink=useRecordDeepLink(rows)
 useAppEvents(ORGANIZATION_EVENT, () => {loadOperationalDocuments().then(setRows).catch(()=>{})})
 const categories=useMemo(()=>[...new Set([...CATEGORIES,...uniqueSortedValues(rows,r=>r.category)])],[rows])
 const filtered=useMemo(()=>{const q=normalizeText(search);return sortRows(rows.filter(r=>(!status||r.status===status)&&(!category||r.category===category)&&(!from||!r.reviewDate||r.reviewDate>=from)&&(!to||!r.reviewDate||r.reviewDate<=to)&&(!q||normalizeText([r.title,r.code,r.owner,r.category,r.description].filter(Boolean).join(' ')).includes(q))),sort)},[rows,search,status,category,from,to,sort])
 const selected=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
 const today=new Date().toISOString().slice(0,10)
 const in30=new Date(Date.now()+30*86400000).toISOString().slice(0,10)
 const metrics=useMemo(()=>({total:filtered.length,active:filtered.filter(r=>r.status==='Σε ισχύ').length,review:filtered.filter(r=>r.status==='Προς αναθεώρηση'||(r.reviewDate&&r.reviewDate>=today&&r.reviewDate<=in30)).length,files:filtered.reduce((n,r)=>n+(r.attachments||[]).length,0)}),[filtered,today,in30])
 const setField=(name,value)=>setForm(c=>({...c,[name]:value}))
 const exportColumns=[
   {label:L('Έγγραφο','Document'),value:r=>r.title||''},{label:L('Κωδικός','Code'),value:r=>r.code||''},
   {label:L('Κατηγορία','Category'),value:r=>V(r.category)||''},{label:L('Έκδοση','Version'),value:r=>r.version||''},
   {label:L('Ιδιοκτήτης','Owner'),value:r=>r.owner||''},{label:L('Αναθεώρηση','Review'),value:r=>r.reviewDate||''},
   {label:L('Κατάσταση','Status'),value:r=>V(r.status)||''},
 ]

 function openNew(){setEditing(null);setForm(EMPTY);setOpen(true)}
 function openRecord(row){notificationLink.markOpened(row.id);setEditing(row);setForm({...EMPTY,...row,attachments:row.attachments||[],versions:row.versions||[]});setOpen(true)}
 function close(){notificationLink.completeReview();setOpen(false);setEditing(null);setForm(EMPTY)}
 async function save(e){
   e.preventDefault()
   if(!form.title.trim()){notifyAction(L('Ο τίτλος είναι υποχρεωτικός.','Title is required.'));return}
   const duplicate=rows.find(row=>row.id!==editing?.id && form.code.trim() && normalizeText(row.code)===normalizeText(form.code))
   if(duplicate){notifyAction(L('Υπάρχει ήδη έγγραφο με τον ίδιο κωδικό.','A document with the same code already exists.'));return}
   if(form.status==='Σε ισχύ' && !(form.attachments||[]).length){notifyAction(L('Για να τεθεί έγγραφο «Σε ισχύ» πρέπει να υπάρχει τουλάχιστον ένα αρχείο.','An in-force document must have at least one attached file.'));return}
   const oldVersion=editing?.version||''
   let versions=form.versions||[]
   if(editing&&oldVersion&&form.version!==oldVersion&&!versions.some(v=>v.version===oldVersion)){
     versions=[{id:`ver-${Date.now()}`,version:oldVersion,date:editing.updatedAt||today,status:editing.status||'',note:'Προηγούμενη έκδοση'},...versions]
   }
   try {
     await saveOperationalDocument({...form,id:editing?.id||form.id,versions,updatedAt:today})
     setRows(await loadOperationalDocuments())
     notifyAction(editing?L('Το έγγραφο ενημερώθηκε.','Document updated.'):L('Το έγγραφο δημιουργήθηκε.','Document created.'))
     close()
   } catch (error) {
     console.error('Document save failed', error)
     notifyAction(L('Η αποθήκευση του εγγράφου απέτυχε.','Document could not be saved.'))
   }
 }
 async function remove(){
   if(!editing||!confirmAction(L('Να διαγραφεί το έγγραφο;','Delete this document?')))return
   try {
     await deleteOperationalDocument(editing.id)
     setRows(await loadOperationalDocuments())
     notifyAction(L('Το έγγραφο διαγράφηκε.','Document deleted.'))
     close()
   } catch (error) {
     console.error('Document delete failed', error)
     notifyAction(L('Η διαγραφή του εγγράφου απέτυχε.','Document could not be deleted.'))
   }
 }

 const columns=[
   {key:'title',label:L('Έγγραφο','Document'),sortable:true,render:r=><EntityCell primary={r.title} secondary={`${L('Ενημέρωση','Updated')} ${displayDate(r.updatedAt)}`}/>},
   {key:'code',label:L('Κωδικός','Code'),width:'125px',sortable:true},
   {key:'category',label:L('Κατηγορία','Category'),width:'130px',sortable:true,render:r=>V(r.category)},
   {key:'version',label:L('Έκδοση','Version'),width:'85px',sortable:true},
   {key:'owner',label:L('Ιδιοκτήτης','Owner'),sortable:true},
   {key:'reviewDate',label:L('Αναθεώρηση','Review'),width:'130px',sortable:true,render:r=>displayDate(r.reviewDate)},
   {key:'attachments',label:L('Αρχεία','Files'),width:'75px',render:r=>(r.attachments||[]).length},
   {key:'status',label:L('Κατάσταση','Status'),width:'145px',render:r=><Badge tone={r.status==='Σε ισχύ'?'success':r.status==='Προς αναθεώρηση'?'warning':r.status==='Καταργημένο'?'danger':'neutral'}>{V(r.status)}</Badge>},
 ]

 return <PageChrome className="organization-unified-page" header={<PageHeader
   title={L('Έγγραφα','Documents')}
   description={L('Ελεγχόμενα έγγραφα, εκδόσεις, υπεύθυνοι, αναθεωρήσεις και συνημμένα.','Controlled documents, versions, owners, review dates and attachments.')}
   actions={<Button icon={<Plus size={17}/>} onClick={openNew}>{L('Νέο έγγραφο','New document')}</Button>}
 />}>
  <ListWorkspace
   stats={<EntitySummary columns={4}><StatCard compact icon={Files} label={L('Έγγραφα','Documents')} value={metrics.total}/><StatCard compact icon={FileCheck2} label={L('Σε ισχύ','In force')} value={metrics.active}/><StatCard compact icon={AlertCircle} label={L('Προς αναθεώρηση','Due for review')} value={metrics.review} tone={metrics.review?'warning':'default'}/><StatCard compact icon={RefreshCw} label={L('Αρχεία','Files')} value={metrics.files}/></EntitySummary>}
   searchValue={search} onSearchChange={setSearch} searchPlaceholder={L('Αναζήτηση τίτλου, κωδικού ή υπευθύνου…','Search title, code or owner…')} activeFilterCount={[search,status,category,from,to].filter(Boolean).length} onClearFilters={()=>{setSearch('');setStatus('');setCategory('');setFrom('');setTo('')}}
   filters={<><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">{L('Όλες οι κατηγορίες','All categories')}</option>{categories.map(x=><option key={x} value={x}>{V(x)}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">{L('Όλες οι καταστάσεις','All statuses')}</option>{STATUSES.map(x=><option key={x} value={x}>{V(x)}</option>)}</select><DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo}/></>}
   selectedCount={selected.length} selectedLabel={L('έγγραφα','documents')} onClearSelection={()=>setSelectedKeys([])}
   bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:L('Ελεγχόμενα Έγγραφα','Controlled Documents'),columns:exportColumns,rows:selected})}>{L('Εκτύπωση / PDF','Print / PDF')}</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:'documents.csv',columns:exportColumns,rows:selected})}>{L('Εξαγωγή CSV','Export CSV')}</Button></>}
   columns={columns} rows={filtered} getRowKey={r=>r.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel={L('Ελεγχόμενα έγγραφα','Controlled documents')} footer={<span>{filtered.length} {L('εγγραφές','records')}</span>} emptyTitle={L('Δεν υπάρχουν έγγραφα','No documents')} highlightedKey={notificationLink.highlightedId}
  />

  <Drawer open={open} onClose={close} title={editing?L('Επεξεργασία εγγράφου','Edit document'):L('Νέο έγγραφο','New document')} description={L('Στοιχεία, έκδοση, αναθεώρηση και αρχεία στην ίδια καρτέλα.','Details, version, review and files in one record.')} width={1120} position="center" footer={<FormActions form="document-form" onCancel={close} extraActions={editing?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>{L('Διαγραφή','Delete')}</Button>:null}/>}>
   <form id="document-form" className="organization-unified-form" onSubmit={save}>
    <FormSection title={L('Ταυτότητα εγγράφου','Document identity')}><FormGrid columns={2}>
     <FormField label={L('Τίτλος','Title')} required><input required value={form.title} onChange={e=>setField('title',e.target.value)}/></FormField>
     <FormField label={L('Κωδικός','Code')}><input value={form.code} onChange={e=>setField('code',e.target.value)}/></FormField>
     <FormField label={L('Κατηγορία','Category')}><LibraryField hideLabel libraryKey="document-categories" value={form.category} onChange={value=>setField('category',value)} placeholder={L('Επιλέξτε κατηγορία','Select category')}/></FormField>
     <FormField label={L('Ιδιοκτήτης / Υπεύθυνος','Owner / Responsible')}><input value={form.owner} onChange={e=>setField('owner',e.target.value)}/></FormField>
     <FormField label={L('Έκδοση','Version')}><input value={form.version} onChange={e=>setField('version',e.target.value)} placeholder={L('π.χ. 2.1','e.g. 2.1')}/></FormField>
     <FormField label={L('Κατάσταση','Status')}><select value={form.status} onChange={e=>setField('status',e.target.value)}>{STATUSES.map(x=><option key={x} value={x}>{V(x)}</option>)}</select></FormField>
     <FormField label={L('Ημερομηνία αναθεώρησης','Review date')}><input type="date" value={form.reviewDate||''} onChange={e=>setField('reviewDate',e.target.value)}/></FormField>
    </FormGrid><FormField label={L('Περιγραφή / σκοπός','Description / purpose')}><textarea rows="4" value={form.description||''} onChange={e=>setField('description',e.target.value)}/></FormField></FormSection>

    <FormSection title={L('Αρχεία','Files')}><AttachmentManager value={form.attachments} onChange={value=>setField('attachments',value)} hint={L('Κύριο έγγραφο, συνοδευτικά αρχεία ή παραρτήματα','Main document, supporting files or appendices')}/></FormSection>

    <FormSection title={`${L('Ιστορικό εκδόσεων','Version history')} (${(form.versions||[]).length})`} description={L('Όταν αλλάζει ο αριθμός έκδοσης, η προηγούμενη έκδοση καταγράφεται αυτόματα στο ιστορικό.','When the version number changes, the previous version is automatically added to history.')}>
     <div className="org-stack-list">{(form.versions||[]).length?form.versions.map(v=><div className="org-stack-row" key={v.id}><div className="org-stack-row__main"><strong>{L('Έκδοση','Version')} {v.version}</strong><small>{displayDate(v.date)} · {V(v.status)||'—'}</small></div><span className="org-muted">{language==='en'&&v.note==='Προηγούμενη έκδοση'?'Previous version':v.note||''}</span></div>):<div className="org-empty">{L('Δεν υπάρχουν προηγούμενες εκδόσεις.','No previous versions.')}</div>}</div>
    </FormSection>
   </form>
  </Drawer>
 </PageChrome>
}

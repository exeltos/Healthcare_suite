import { formatDate } from '../../core/utils/dateTime'
import { confirmAction } from '../../components/core/feedback/index'
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
import { deleteDocument, loadDocuments, ORGANIZATION_EVENT, upsertDocument } from '../../services/organizationService'
import { useRecordDeepLink } from '../../core/navigation/recordDeepLink'
import './OrganizationUnified.css'

const EMPTY={id:'',title:'',code:'',category:'Πολιτική',version:'1.0',owner:'',reviewDate:'',status:'Πρόχειρο',description:'',attachments:[],versions:[]}
const STATUSES=['Σε ισχύ','Προς αναθεώρηση','Πρόχειρο','Καταργημένο']
const CATEGORIES=['Πολιτική','Διαδικασία','Οδηγία','Πρωτόκολλο','Έντυπο','Κανονισμός','Άλλο']
const displayDate = formatDate
const exportColumns=[{label:'Έγγραφο',value:r=>r.title||''},{label:'Κωδικός',value:r=>r.code||''},{label:'Κατηγορία',value:r=>r.category||''},{label:'Έκδοση',value:r=>r.version||''},{label:'Ιδιοκτήτης',value:r=>r.owner||''},{label:'Αναθεώρηση',value:r=>r.reviewDate||''},{label:'Κατάσταση',value:r=>r.status||''}]

export default function DocumentsPage(){
 const [rows,setRows]=useState(loadDocuments); const [search,setSearch]=useState(''); const [status,setStatus]=useState(''); const [category,setCategory]=useState(''); const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sort,setSort]=useState({key:'title',direction:'asc'}); const [selectedKeys,setSelectedKeys]=useState([])
 const [open,setOpen]=useState(false); const [editing,setEditing]=useState(null); const [form,setForm]=useState(EMPTY)
 const notificationLink=useRecordDeepLink(rows)
 useAppEvents(ORGANIZATION_EVENT, () => setRows(loadDocuments()))
 const categories=useMemo(()=>[...new Set([...CATEGORIES,...uniqueSortedValues(rows,r=>r.category)])],[rows])
 const filtered=useMemo(()=>{const q=normalizeText(search);return sortRows(rows.filter(r=>(!status||r.status===status)&&(!category||r.category===category)&&(!from||!r.reviewDate||r.reviewDate>=from)&&(!to||!r.reviewDate||r.reviewDate<=to)&&(!q||normalizeText([r.title,r.code,r.owner,r.category,r.description].filter(Boolean).join(' ')).includes(q))),sort)},[rows,search,status,category,from,to,sort])
 const selected=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys]); const today=new Date().toISOString().slice(0,10); const in30=new Date(Date.now()+30*86400000).toISOString().slice(0,10)
 const metrics=useMemo(()=>({total:filtered.length,active:filtered.filter(r=>r.status==='Σε ισχύ').length,review:filtered.filter(r=>r.status==='Προς αναθεώρηση'||(r.reviewDate&&r.reviewDate>=today&&r.reviewDate<=in30)).length,files:filtered.reduce((n,r)=>n+(r.attachments||[]).length,0)}),[filtered,today,in30])
 const setField=(name,value)=>setForm(c=>({...c,[name]:value}))
 function openNew(){setEditing(null);setForm(EMPTY);setOpen(true)}
 function openRecord(row){notificationLink.markOpened(row.id);setEditing(row);setForm({...EMPTY,...row,attachments:row.attachments||[],versions:row.versions||[]});setOpen(true)}
 function close(){notificationLink.completeReview();setOpen(false);setEditing(null);setForm(EMPTY)}
 function save(e){e.preventDefault();const oldVersion=editing?.version||'';let versions=form.versions||[];if(editing&&oldVersion&&form.version!==oldVersion&&!versions.some(v=>v.version===oldVersion)){versions=[{id:`ver-${Date.now()}`,version:oldVersion,date:editing.updatedAt||today,status:editing.status||'',note:'Προηγούμενη έκδοση'},...versions]};upsertDocument({...form,id:editing?.id||form.id,versions,updatedAt:today});setRows(loadDocuments());close()}
 function remove(){if(!editing||!confirmAction('Να διαγραφεί το έγγραφο;'))return;deleteDocument(editing.id);setRows(loadDocuments());close()}
 const columns=[{key:'title',label:'Έγγραφο',sortable:true,render:r=><EntityCell primary={r.title} secondary={`Ενημέρωση ${displayDate(r.updatedAt)}`}/>},{key:'code',label:'Κωδικός',width:'125px',sortable:true},{key:'category',label:'Κατηγορία',width:'130px',sortable:true},{key:'version',label:'Έκδοση',width:'85px',sortable:true},{key:'owner',label:'Ιδιοκτήτης',sortable:true},{key:'reviewDate',label:'Αναθεώρηση',width:'130px',sortable:true,render:r=>displayDate(r.reviewDate)},{key:'attachments',label:'Αρχεία',width:'75px',render:r=>(r.attachments||[]).length},{key:'status',label:'Κατάσταση',width:'145px',render:r=><Badge tone={r.status==='Σε ισχύ'?'success':r.status==='Προς αναθεώρηση'?'warning':r.status==='Καταργημένο'?'danger':'neutral'}>{r.status}</Badge>}]
 return <PageChrome className="organization-unified-page" header={<PageHeader title="Έγγραφα" description="Ελεγχόμενα έγγραφα, εκδόσεις, υπεύθυνοι, αναθεωρήσεις και συνημμένα." actions={<Button icon={<Plus size={17}/>} onClick={openNew}>Νέο έγγραφο</Button>}/> }>
  <ListWorkspace stats={<EntitySummary columns={4}><StatCard compact icon={Files} label="Έγγραφα" value={metrics.total}/><StatCard compact icon={FileCheck2} label="Σε ισχύ" value={metrics.active}/><StatCard compact icon={AlertCircle} label="Προς αναθεώρηση" value={metrics.review} tone={metrics.review?'warning':'default'}/><StatCard compact icon={RefreshCw} label="Αρχεία" value={metrics.files}/></EntitySummary>}
   searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση τίτλου, κωδικού ή υπευθύνου…" activeFilterCount={[search,status,category,from,to].filter(Boolean).length} onClearFilters={()=>{setSearch('');setStatus('');setCategory('');setFrom('');setTo('')}}
   filters={<><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Όλες οι κατηγορίες</option>{categories.map(x=><option key={x}>{x}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Όλες οι καταστάσεις</option>{STATUSES.map(x=><option key={x}>{x}</option>)}</select><DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo}/></>}
   selectedCount={selected.length} selectedLabel="έγγραφα" onClearSelection={()=>setSelectedKeys([])} bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:'Ελεγχόμενα Έγγραφα',columns:exportColumns,rows:selected})}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:'eggrafa.csv',columns:exportColumns,rows:selected})}>Εξαγωγή CSV</Button></>}
   columns={columns} rows={filtered} getRowKey={r=>r.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel="Ελεγχόμενα έγγραφα" footer={<span>{filtered.length} εγγραφές</span>} emptyTitle="Δεν υπάρχουν έγγραφα" highlightedKey={notificationLink.highlightedId}/>

  <Drawer open={open} onClose={close} title={editing?'Επεξεργασία εγγράφου':'Νέο έγγραφο'} description="Στοιχεία, έκδοση, αναθεώρηση και αρχεία στην ίδια καρτέλα." width={1120} position="center" footer={<FormActions form="document-form" onCancel={close} extraActions={editing?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή</Button>:null}/> }>
   <form id="document-form" className="organization-unified-form" onSubmit={save}>
    <FormSection title="Ταυτότητα εγγράφου"><FormGrid columns={2}>
     <FormField label="Τίτλος" required><input required value={form.title} onChange={e=>setField('title',e.target.value)}/></FormField><FormField label="Κωδικός"><input value={form.code} onChange={e=>setField('code',e.target.value)}/></FormField>
     <FormField label="Κατηγορία"><LibraryField hideLabel allowManual libraryKey="document-categories" value={form.category} onChange={value=>setField('category',value)} placeholder="Επιλέξτε ή γράψτε κατηγορία"/></FormField><FormField label="Ιδιοκτήτης / Υπεύθυνος"><input value={form.owner} onChange={e=>setField('owner',e.target.value)}/></FormField>
     <FormField label="Έκδοση"><input value={form.version} onChange={e=>setField('version',e.target.value)} placeholder="π.χ. 2.1"/></FormField><FormField label="Κατάσταση"><select value={form.status} onChange={e=>setField('status',e.target.value)}>{STATUSES.map(x=><option key={x}>{x}</option>)}</select></FormField>
     <FormField label="Ημερομηνία αναθεώρησης"><input type="date" value={form.reviewDate||''} onChange={e=>setField('reviewDate',e.target.value)}/></FormField>
    </FormGrid><FormField label="Περιγραφή / σκοπός"><textarea rows="4" value={form.description||''} onChange={e=>setField('description',e.target.value)}/></FormField></FormSection>
    <FormSection title="Αρχεία"><AttachmentManager value={form.attachments} onChange={value=>setField('attachments',value)} hint="Κύριο έγγραφο, συνοδευτικά αρχεία ή παραρτήματα"/></FormSection>
    <FormSection title={`Ιστορικό εκδόσεων (${(form.versions||[]).length})`} description="Όταν αλλάζει ο αριθμός έκδοσης, η προηγούμενη έκδοση καταγράφεται αυτόματα στο ιστορικό.">
     <div className="org-stack-list">{(form.versions||[]).length?form.versions.map(v=><div className="org-stack-row" key={v.id}><div className="org-stack-row__main"><strong>Έκδοση {v.version}</strong><small>{displayDate(v.date)} · {v.status||'—'}</small></div><span className="org-muted">{v.note||''}</span></div>):<div className="org-empty">Δεν υπάρχουν προηγούμενες εκδόσεις.</div>}</div>
    </FormSection>
   </form>
  </Drawer>
 </PageChrome>
}

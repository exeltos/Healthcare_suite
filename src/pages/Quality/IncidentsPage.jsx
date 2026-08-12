import { formatDate, todayIso } from '../../core/utils/dateTime'
import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarDays, ClipboardCheck, Download, Plus, Printer, ShieldAlert, Trash2, Workflow } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  BackLink, Badge, Button, DateRangeFilter, Drawer, EntityCell, EntitySummary, FormActions, FormField, FormGrid,
  FormSection, LibraryField, ListWorkspace, PageChrome, PageHeader, StatCard, Timeline,
} from '../../components/core'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { loadIncidents, saveIncidents } from '../../services/qualityService'
import { buildQualityTimeline, createCapaFromSource, getRelatedQualityRecords } from '../../services/qualityWorkflowService'
import './QualityUnified.css'
import { masterNames } from '../../services/masterDataService'

const INCIDENT_TYPES = [
  'Ταυτοποίηση ασθενή', 'Φαρμακευτική ασφάλεια', 'Χειρουργείο / επεμβατική πράξη', 'Πτώση',
  'Έλκος πίεσης', 'Διάγνωση / καθυστέρηση διάγνωσης', 'Επικοινωνία / παράδοση φροντίδας',
  'Ιατροτεχνολογικός εξοπλισμός', 'Μετάγγιση αίματος', 'Λοίμωξη / πρόληψη λοιμώξεων',
  'Τεκμηρίωση / φάκελος ασθενή', 'Περιβάλλον / υποδομή', 'Άλλο συμβάν ασφάλειας',
]
const OUTCOMES = ['Χωρίς βλάβη / near miss', 'Ήπια βλάβη', 'Μέτρια βλάβη', 'Σοβαρή βλάβη', 'Θάνατος']
const STATUSES = ['Νέα αναφορά', 'Υπό διερεύνηση', 'Σε ενέργειες βελτίωσης', 'Κλειστό']
const EMPTY = { date: new Date().toISOString().slice(0,10), time:'', title:'', category:'Ταυτοποίηση ασθενή', department:'', location:'', outcome:'Χωρίς βλάβη / near miss', status:'Νέα αναφορά', owner:'', patientCode:'', description:'', immediateActions:'', contributingFactors:'', rootCause:'', lessonsLearned:'', reporter:'', anonymous:false }

const displayDate = formatDate
function outcomeTone(value){ if(value==='Θάνατος'||value==='Σοβαρή βλάβη') return 'danger'; if(value==='Μέτρια βλάβη') return 'warning'; if(value==='Χωρίς βλάβη / near miss') return 'success'; return 'neutral' }
const exportColumns=[
  {label:'Κωδικός',value:r=>r.id||''},{label:'Ημερομηνία',value:r=>r.date||''},{label:'Συμβάν',value:r=>r.title||''},
  {label:'Κατηγορία',value:r=>r.category||''},{label:'Τμήμα',value:r=>r.department||''},{label:'Έκβαση',value:r=>r.outcome||''},
  {label:'Κατάσταση',value:r=>r.status||''},{label:'Υπεύθυνος',value:r=>r.owner||''},
]

export default function IncidentsPage(){
  const navigate=useNavigate(); const [searchParams,setSearchParams]=useSearchParams()
  const [rows,setRows]=useState(loadIncidents)
  const [search,setSearch]=useState(''); const [category,setCategory]=useState(''); const [status,setStatus]=useState(''); const [department,setDepartment]=useState('')
  const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sort,setSort]=useState({key:'date',direction:'desc'}); const [selectedKeys,setSelectedKeys]=useState([])
  const [drawerOpen,setDrawerOpen]=useState(false); const [editing,setEditing]=useState(null); const [form,setForm]=useState(EMPTY)
  useEffect(()=>{const id=searchParams.get('record');if(!id)return;const row=rows.find(r=>r.id===id);if(row)openRecord(row);setSearchParams({}, {replace:true})},[searchParams,setSearchParams,rows])
  const departments=masterNames('departments')
  const filtered=useMemo(()=>{const q=normalizeText(search);return sortRows(rows.filter(r=>(!category||r.category===category)&&(!status||r.status===status)&&(!department||r.department===department)&&(!from||r.date>=from)&&(!to||r.date<=to)&&(!q||normalizeText([r.id,r.title,r.category,r.department,r.owner,r.description,r.patientCode].filter(Boolean).join(' ')).includes(q))),sort)},[rows,search,category,status,department,from,to,sort])
  const selectedRowsData=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const metrics=useMemo(()=>({total:filtered.length,open:filtered.filter(r=>r.status!=='Κλειστό').length,severe:filtered.filter(r=>['Σοβαρή βλάβη','Θάνατος'].includes(r.outcome)).length,nearMiss:filtered.filter(r=>r.outcome==='Χωρίς βλάβη / near miss').length}),[filtered])
  function setField(name,value){setForm(c=>({...c,[name]:value}))}
  function openNew(){setEditing(null);setForm(EMPTY);setDrawerOpen(true)}
  function openRecord(row){setEditing(row);setForm({...EMPTY,...row});setDrawerOpen(true)}
  function close(){setDrawerOpen(false);setEditing(null);setForm(EMPTY)}
  function save(e){e.preventDefault();const record={...form,id:editing?.id||`INC-${Date.now().toString().slice(-7)}`,updatedAt:new Date().toISOString(),createdAt:editing?.createdAt||new Date().toISOString()};const next=editing?rows.map(r=>r.id===editing.id?record:r):[record,...rows];setRows(saveIncidents(next));close()}
  function remove(){if(!editing||!confirmAction('Να διαγραφεί το συμβάν;'))return;const next=rows.filter(r=>r.id!==editing.id);setRows(saveIncidents(next));close()}
  function createCapa(){if(!editing)return;const record=createCapaFromSource({sourceId:editing.id,sourceType:'Συμβάν',title:`Ενέργεια: ${form.title}`,department:form.department,owner:form.owner||'Ομάδα Ποιότητας',priority:['Σοβαρή βλάβη','Θάνατος'].includes(form.outcome)?'Υψηλή':'Μέτρια',description:form.description,rootCause:form.rootCause||''});const updated={...form,status:'Σε ενέργειες βελτίωσης'};setForm(updated);setRows(saveIncidents(rows.map(r=>r.id===editing.id?{...r,status:'Σε ενέργειες βελτίωσης'}:r)));notifyAction(`Δημιουργήθηκε ${record.id}`)}
  function createAudit(){if(!editing)return;const params=new URLSearchParams({source:editing.id,sourceType:'Συμβάν',department:form.department||'',scope:`Διερεύνηση συμβάντος: ${form.title}`});navigate(`/quality/audits?${params.toString()}`)}
  const related=editing?getRelatedQualityRecords(editing.id):{capa:[],audits:[]}
  const timeline=editing?buildQualityTimeline({incident:{...editing,...form},relatedCapa:related.capa,relatedAudits:related.audits}):[]
  const columns=[
    {key:'date',label:'Ημερομηνία',width:'125px',sortable:true,render:r=>displayDate(r.date)},
    {key:'title',label:'Συμβάν',sortable:true,render:r=><EntityCell primary={r.title||'—'} secondary={`${r.id||''}${r.category?` · ${r.category}`:''}`}/>},
    {key:'department',label:'Τμήμα',sortable:true},{key:'outcome',label:'Έκβαση',width:'170px',render:r=><Badge tone={outcomeTone(r.outcome)}>{r.outcome||'—'}</Badge>},
    {key:'status',label:'Κατάσταση',width:'170px',sortable:true,render:r=><Badge tone={r.status==='Κλειστό'?'success':r.status==='Υπό διερεύνηση'?'warning':'neutral'}>{r.status||'—'}</Badge>},
    {key:'owner',label:'Υπεύθυνος',sortable:true},
  ]
  return <PageChrome className="quality-unified-page" back={<BackLink onClick={()=>navigate('/quality')}>Πίσω στο Quality Hub</BackLink>} header={<PageHeader title="Συμβάντα Ασφάλειας" description="Αναφορά, διερεύνηση και παρακολούθηση συμβάντων ασφάλειας ασθενών με δομημένη ροή." actions={<Button icon={<Plus size={17}/>} onClick={openNew}>Νέο συμβάν</Button>}/> }>
    <ListWorkspace stats={<EntitySummary columns={4}><StatCard compact icon={ShieldAlert} label="Συμβάντα" value={metrics.total}/><StatCard compact icon={Workflow} label="Ανοικτά" value={metrics.open}/><StatCard compact icon={AlertTriangle} label="Σοβαρά" value={metrics.severe} tone={metrics.severe?'warning':'default'}/><StatCard compact icon={CalendarDays} label="Near miss" value={metrics.nearMiss}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση συμβάντος, τμήματος ή κωδικού…" activeFilterCount={[search,category,status,department,from,to].filter(Boolean).length} onClearFilters={()=>{setSearch('');setCategory('');setStatus('');setDepartment('');setFrom('');setTo('')}}
      filters={<><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Όλες οι κατηγορίες</option>{INCIDENT_TYPES.map(x=><option key={x}>{x}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Όλες οι καταστάσεις</option>{STATUSES.map(x=><option key={x}>{x}</option>)}</select><select value={department} onChange={e=>setDepartment(e.target.value)}><option value="">Όλα τα τμήματα</option>{departments.map(x=><option key={x}>{x}</option>)}</select><DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo}/></>}
      selectedCount={selectedRowsData.length} selectedLabel="συμβάντα" onClearSelection={()=>setSelectedKeys([])} bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:'Συμβάντα Ασφάλειας',columns:exportColumns,rows:selectedRowsData})}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:'symvanta-asfaleias.csv',columns:exportColumns,rows:selectedRowsData})}>Εξαγωγή CSV</Button></>}
      columns={columns} rows={filtered} getRowKey={r=>r.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel="Συμβάντα ασφάλειας" emptyTitle="Δεν υπάρχουν συμβάντα" footer={<span>{filtered.length} εγγραφές</span>}/>
    <Drawer open={drawerOpen} onClose={close} title={editing?'Επεξεργασία συμβάντος':'Νέο συμβάν ασφάλειας'} description="Καταγράψτε τα πραγματικά γεγονότα, την έκβαση και τις ενέργειες χωρίς απόδοση υπαιτιότητας." width={1120} position="center" footer={<FormActions form="incident-form" onCancel={close} extraActions={editing?<div className="quality-inline-actions"><Button variant="secondary" icon={<ClipboardCheck size={16}/>} onClick={createAudit}>Δημιουργία Audit</Button><Button variant="secondary" onClick={createCapa}>Δημιουργία CAPA</Button><Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή</Button></div>:null}/> }>
      <form id="incident-form" className="quality-unified-form" onSubmit={save}>
        <div className="quality-odipy-note"><strong>Δομή ασφάλειας ασθενών:</strong> η φόρμα οργανώνει το συμβάν με βάση διεθνείς στόχους ασφάλειας και διαθέσιμα εργαλεία ΟΔΙΠΥ. Η αναφορά διαχωρίζεται από τη διερεύνηση και τις ενέργειες βελτίωσης.</div>
        {editing&&<FormSection title="Ροή Ποιότητας" description="Το συμβάν συνδέεται με τη διερεύνηση, τα audits και τις ενέργειες βελτίωσης χωρίς διπλή καταχώρηση."><div className="quality-timeline-wrap"><Timeline items={timeline} empty={<div className="quality-odipy-note">Δεν υπάρχουν ακόμη συνδεδεμένες ενέργειες.</div>}/></div></FormSection>}
                <FormSection title="Βασικά στοιχεία"><FormGrid columns={2}><FormField label="Τίτλος συμβάντος" required><input required value={form.title} onChange={e=>setField('title',e.target.value)}/></FormField><FormField label="Κατηγορία" required><select value={form.category} onChange={e=>setField('category',e.target.value)}>{INCIDENT_TYPES.map(x=><option key={x}>{x}</option>)}</select></FormField><FormField label="Ημερομηνία" required><input required type="date" value={form.date} onChange={e=>setField('date',e.target.value)}/></FormField><FormField label="Ώρα"><input type="time" value={form.time||''} onChange={e=>setField('time',e.target.value)}/></FormField><FormField label="Τμήμα" required><LibraryField hideLabel libraryKey="departments" value={form.department} onChange={v=>setField('department',v)} placeholder="Επιλέξτε τμήμα"/></FormField><FormField label="Χώρος / σημείο"><input value={form.location||''} onChange={e=>setField('location',e.target.value)}/></FormField><FormField label="Κωδικός ασθενή (προαιρετικό)"><input value={form.patientCode||''} onChange={e=>setField('patientCode',e.target.value)}/></FormField><FormField label="Έκβαση / βαθμός βλάβης"><select value={form.outcome} onChange={e=>setField('outcome',e.target.value)}>{OUTCOMES.map(x=><option key={x}>{x}</option>)}</select></FormField></FormGrid></FormSection>
        <FormSection title="Περιγραφή και άμεση αντιμετώπιση"><FormField label="Τι συνέβη;" required><textarea rows="5" required value={form.description||''} onChange={e=>setField('description',e.target.value)}/></FormField><FormField label="Άμεσες ενέργειες / φροντίδα"><textarea rows="4" value={form.immediateActions||''} onChange={e=>setField('immediateActions',e.target.value)}/></FormField></FormSection>
        <FormSection title="Διερεύνηση"><FormGrid columns={2}><FormField label="Υπεύθυνος διερεύνησης"><input value={form.owner||''} onChange={e=>setField('owner',e.target.value)}/></FormField><FormField label="Κατάσταση"><select value={form.status} onChange={e=>setField('status',e.target.value)}>{STATUSES.map(x=><option key={x}>{x}</option>)}</select></FormField></FormGrid><FormField label="Συνεισφέροντες παράγοντες"><textarea rows="4" value={form.contributingFactors||''} onChange={e=>setField('contributingFactors',e.target.value)}/></FormField><FormField label="Βασική αιτία / συμπέρασμα διερεύνησης"><textarea rows="4" value={form.rootCause||''} onChange={e=>setField('rootCause',e.target.value)}/></FormField><FormField label="Μάθηση / μέτρα πρόληψης επανάληψης"><textarea rows="4" value={form.lessonsLearned||''} onChange={e=>setField('lessonsLearned',e.target.value)}/></FormField></FormSection>
      </form>
    </Drawer>
  </PageChrome>
}
import { APP_ROUTES } from '../../config/routes'
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
import { loadIncidents } from '../../services/qualityService'
import { deleteQualityIncident, loadQualityIncidents, saveQualityIncident, saveQualityCapa } from '../../services/backend/qualityBackendService'
import { buildQualityTimeline, createCapaFromSourceAsync, getRelatedQualityRecordsAsync } from '../../services/qualityWorkflowService'
import { useI18n } from '../../i18n'
import { qualityDisplayValue } from './qualityPresentation'
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
const buildExportColumns=(L)=>[
  {label:'Κωδικός',value:r=>r.id||''},{label:L('Ημερομηνία','Date'),value:r=>r.date||''},{label:L('Συμβάν','Incident'),value:r=>r.title||''},
  {label:'Κατηγορία',value:r=>r.category||''},{label:L('Τμήμα','Department'),value:r=>r.department||''},{label:L('Έκβαση','Outcome'),value:r=>r.outcome||''},
  {label:L('Κατάσταση','Status'),value:r=>r.status||''},{label:L('Υπεύθυνος','Owner'),value:r=>r.owner||''},
]

export default function IncidentsPage(){
  const { language } = useI18n()
  const L=(el,en)=>language==='en'?en:el
  const exportColumns=buildExportColumns(L)
  const navigate=useNavigate(); const [searchParams,setSearchParams]=useSearchParams()
  const [rows,setRows]=useState(loadIncidents)
  useEffect(()=>{loadQualityIncidents().then(setRows).catch(()=>{})},[])
  const [search,setSearch]=useState(''); const [category,setCategory]=useState(''); const [status,setStatus]=useState(''); const [department,setDepartment]=useState('')
  const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sort,setSort]=useState({key:'date',direction:'desc'}); const [selectedKeys,setSelectedKeys]=useState([])
  const [drawerOpen,setDrawerOpen]=useState(false); const [editing,setEditing]=useState(null); const [form,setForm]=useState(EMPTY); const [related,setRelated]=useState({capa:[],audits:[]})
  useEffect(()=>{const id=searchParams.get('record');if(!id)return;const row=rows.find(r=>r.id===id);if(row)openRecord(row);setSearchParams({}, {replace:true})},[searchParams,setSearchParams,rows])
  const departments=masterNames('departments')
  const filtered=useMemo(()=>{const q=normalizeText(search);return sortRows(rows.filter(r=>(!category||r.category===category)&&(!status||r.status===status)&&(!department||r.department===department)&&(!from||r.date>=from)&&(!to||r.date<=to)&&(!q||normalizeText([r.id,r.title,r.category,r.department,r.owner,r.description,r.patientCode].filter(Boolean).join(' ')).includes(q))),sort)},[rows,search,category,status,department,from,to,sort])
  const selectedRowsData=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const metrics=useMemo(()=>({total:filtered.length,open:filtered.filter(r=>r.status!=='Κλειστό').length,severe:filtered.filter(r=>['Σοβαρή βλάβη','Θάνατος'].includes(r.outcome)).length,nearMiss:filtered.filter(r=>r.outcome==='Χωρίς βλάβη / near miss').length}),[filtered])
  function setField(name,value){setForm(c=>({...c,[name]:value}))}
  function openNew(){setEditing(null);setForm(EMPTY);setDrawerOpen(true)}
  function openRecord(row){setEditing(row);setForm({...EMPTY,...row});setDrawerOpen(true);getRelatedQualityRecordsAsync(row.id).then(setRelated).catch(()=>setRelated({capa:[],audits:[]}))}
  function close(){setDrawerOpen(false);setEditing(null);setForm(EMPTY)}
  async function save(e){e.preventDefault();const record={...form,id:editing?.id||`INC-${Date.now().toString().slice(-7)}`,updatedAt:new Date().toISOString(),createdAt:editing?.createdAt||new Date().toISOString()};await saveQualityIncident(record);setRows(await loadQualityIncidents());close()}
  async function remove(){if(!editing||!confirmAction(L('Να διαγραφεί το συμβάν;','Delete this incident?')))return;await deleteQualityIncident(editing.id);setRows(await loadQualityIncidents());close()}
  async function createCapa(){
    if(!editing)return
    const existing=related.capa.find(item=>item.source===editing.id&&item.sourceType==='Συμβάν'&&item.status!=='Ακυρωμένη')
    if(existing){notifyAction(L('Υπάρχει ήδη ενεργή ενέργεια βελτίωσης για αυτό το συμβάν.','An active improvement action already exists for this incident.'));return}
    await createCapaFromSourceAsync({sourceId:editing.id,sourceType:'Συμβάν',title:`Ενέργεια: ${form.title}`,department:form.department,owner:form.owner||'Ομάδα Ποιότητας',priority:['Σοβαρή βλάβη','Θάνατος'].includes(form.outcome)?'Υψηλή':'Μέτρια',description:form.description,rootCause:form.rootCause||''})
    const updated={...form,status:'Σε ενέργειες βελτίωσης'}
    setForm(updated)
    await saveQualityIncident({...editing,...updated})
    setRows(await loadQualityIncidents())
    setRelated(await getRelatedQualityRecordsAsync(editing.id))
  }
  function createAudit(){if(!editing)return;const params=new URLSearchParams({source:editing.id,sourceType:'Συμβάν',department:form.department||'',scope:`Διερεύνηση συμβάντος: ${form.title}`});navigate(`${APP_ROUTES.QUALITY_AUDITS}?${params.toString()}`)}
  const timeline=editing?buildQualityTimeline({incident:{...editing,...form},relatedCapa:related.capa,relatedAudits:related.audits,language}):[]
  const columns=[
    {key:'date',label:L('Ημερομηνία','Date'),width:'125px',sortable:true,render:r=>displayDate(r.date)},
    {key:'title',label:L('Συμβάν','Incident'),sortable:true,render:r=><EntityCell primary={r.title||'—'} secondary={`${r.id||''}${r.category?` · ${r.category}`:''}`}/>},
    {key:'department',label:L('Τμήμα','Department'),sortable:true},{key:'outcome',label:L('Έκβαση','Outcome'),width:'170px',render:r=><Badge tone={outcomeTone(r.outcome)}>{qualityDisplayValue(r.outcome,language)||'—'}</Badge>},
    {key:'status',label:L('Κατάσταση','Status'),width:'170px',sortable:true,render:r=><Badge tone={r.status==='Κλειστό'?'success':r.status==='Υπό διερεύνηση'?'warning':'neutral'}>{qualityDisplayValue(r.status,language)||'—'}</Badge>},
    {key:'owner',label:L('Υπεύθυνος','Owner'),sortable:true},
  ]
  return <PageChrome className="quality-unified-page" back={<BackLink onClick={()=>navigate(APP_ROUTES.QUALITY)}>{L('Πίσω στο Quality Hub','Back to Quality Hub')}</BackLink>} header={<PageHeader title={L('Συμβάντα Ασφάλειας','Safety Incidents')} description={L('Αναφορά, διερεύνηση και παρακολούθηση συμβάντων ασφάλειας ασθενών με δομημένη ροή.','Report, investigate and follow patient-safety incidents through a structured workflow.')} actions={<Button icon={<Plus size={17}/>} onClick={openNew}>{L('Νέο συμβάν','New incident')}</Button>}/> }>
    <ListWorkspace stats={<EntitySummary columns={4}><StatCard compact icon={ShieldAlert} label={L('Συμβάντα','Incidents')} value={metrics.total}/><StatCard compact icon={Workflow} label={L('Ανοικτά','Open')} value={metrics.open}/><StatCard compact icon={AlertTriangle} label={L('Σοβαρά','Severe')} value={metrics.severe} tone={metrics.severe?'warning':'default'}/><StatCard compact icon={CalendarDays} label="Near miss" value={metrics.nearMiss}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder={L('Αναζήτηση συμβάντος, τμήματος ή κωδικού…','Search incident, department or code…')} activeFilterCount={[search,category,status,department,from,to].filter(Boolean).length} onClearFilters={()=>{setSearch('');setCategory('');setStatus('');setDepartment('');setFrom('');setTo('')}}
      filters={<><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">{L('Όλες οι κατηγορίες','All categories')}</option>{INCIDENT_TYPES.map(x=><option key={x} value={x}>{qualityDisplayValue(x,language)}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">{L('Όλες οι καταστάσεις','All statuses')}</option>{STATUSES.map(x=><option key={x} value={x}>{qualityDisplayValue(x,language)}</option>)}</select><select value={department} onChange={e=>setDepartment(e.target.value)}><option value="">{L('Όλα τα τμήματα','All departments')}</option>{departments.map(x=><option key={x}>{x}</option>)}</select><DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo}/></>}
      selectedCount={selectedRowsData.length} selectedLabel={L('συμβάντα','incidents')} onClearSelection={()=>setSelectedKeys([])} bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:'Συμβάντα Ασφάλειας',columns:exportColumns,rows:selectedRowsData})}>{L('Εκτύπωση / PDF','Print / PDF')}</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:'symvanta-asfaleias.csv',columns:exportColumns,rows:selectedRowsData})}>{L('Εξαγωγή CSV','Export CSV')}</Button></>}
      columns={columns} rows={filtered} getRowKey={r=>r.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel={L('Συμβάντα ασφάλειας','Safety incidents')} emptyTitle={L('Δεν υπάρχουν συμβάντα','No incidents')} footer={<span>{filtered.length} {L('εγγραφές','records')}</span>}/>
    <Drawer open={drawerOpen} onClose={close} title={editing?L('Επεξεργασία συμβάντος','Edit incident'):L('Νέο συμβάν ασφάλειας','New safety incident')} description={L('Καταγράψτε τα πραγματικά γεγονότα, την έκβαση και τις ενέργειες χωρίς απόδοση υπαιτιότητας.','Record factual events, outcome and actions without assigning blame.')} width={1120} position="center" footer={<FormActions form="incident-form" onCancel={close} extraActions={editing?<div className="quality-inline-actions"><Button variant="secondary" icon={<ClipboardCheck size={16}/>} onClick={createAudit}>{L('Δημιουργία Audit','Create Audit')}</Button><Button variant="secondary" onClick={createCapa}>{L('Δημιουργία CAPA','Create CAPA')}</Button><Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>{L('Διαγραφή','Delete')}</Button></div>:null}/> }>
      <form id="incident-form" className="quality-unified-form" onSubmit={save}>
        <div className="quality-odipy-note"><strong>{L("Δομή ασφάλειας ασθενών:","Patient-safety structure:")}</strong> {L("η φόρμα οργανώνει το συμβάν με βάση διεθνείς στόχους ασφάλειας και διαθέσιμα εργαλεία ΟΔΙΠΥ. Η αναφορά διαχωρίζεται από τη διερεύνηση και τις ενέργειες βελτίωσης.","the form structures the incident using international patient-safety goals and available ODIPY tools. Reporting is separated from investigation and improvement actions.")}</div>
        {editing&&<FormSection title={L('Ροή Ποιότητας','Quality Workflow')} description={L("Το συμβάν συνδέεται με τη διερεύνηση, τα audits και τις ενέργειες βελτίωσης χωρίς διπλή καταχώρηση.","The incident is linked to investigation, audits and improvement actions without duplicate entry.")}><div className="quality-timeline-wrap"><Timeline items={timeline} empty={<div className="quality-odipy-note">{L("Δεν υπάρχουν ακόμη συνδεδεμένες ενέργειες.","No linked actions yet.")}</div>}/></div></FormSection>}
                <FormSection title={L('Βασικά στοιχεία','Basic details')}><FormGrid columns={2}><FormField label={L('Τίτλος συμβάντος','Incident title')} required><input required value={form.title} onChange={e=>setField('title',e.target.value)}/></FormField><FormField label={L('Κατηγορία','Category')} required><select value={form.category} onChange={e=>setField('category',e.target.value)}>{INCIDENT_TYPES.map(x=><option key={x} value={x}>{qualityDisplayValue(x,language)}</option>)}</select></FormField><FormField label={L('Ημερομηνία','Date')} required><input required type="date" value={form.date} onChange={e=>setField('date',e.target.value)}/></FormField><FormField label={L('Ώρα','Time')}><input type="time" value={form.time||''} onChange={e=>setField('time',e.target.value)}/></FormField><FormField label={L('Τμήμα','Department')} required><LibraryField hideLabel libraryKey="departments" value={form.department} onChange={v=>setField('department',v)} placeholder={L('Επιλέξτε τμήμα','Select department')}/></FormField><FormField label={L('Χώρος / σημείο','Location / point')}><input value={form.location||''} onChange={e=>setField('location',e.target.value)}/></FormField><FormField label={L('Κωδικός ασθενή (προαιρετικό)','Patient code (optional)')}><input value={form.patientCode||''} onChange={e=>setField('patientCode',e.target.value)}/></FormField><FormField label={L('Έκβαση / βαθμός βλάβης','Outcome / harm level')}><select value={form.outcome} onChange={e=>setField('outcome',e.target.value)}>{OUTCOMES.map(x=><option key={x} value={x}>{qualityDisplayValue(x,language)}</option>)}</select></FormField></FormGrid></FormSection>
        <FormSection title={L('Περιγραφή και άμεση αντιμετώπιση','Description and immediate response')}><FormField label={L('Τι συνέβη;','What happened?')} required><textarea rows="5" required value={form.description||''} onChange={e=>setField('description',e.target.value)}/></FormField><FormField label={L('Άμεσες ενέργειες / φροντίδα','Immediate actions / care')}><textarea rows="4" value={form.immediateActions||''} onChange={e=>setField('immediateActions',e.target.value)}/></FormField></FormSection>
        <FormSection title={L('Διερεύνηση','Investigation')}><FormGrid columns={2}><FormField label={L('Υπεύθυνος διερεύνησης','Investigation owner')}><input value={form.owner||''} onChange={e=>setField('owner',e.target.value)}/></FormField><FormField label={L('Κατάσταση','Status')}><select value={form.status} onChange={e=>setField('status',e.target.value)}>{STATUSES.map(x=><option key={x} value={x}>{qualityDisplayValue(x,language)}</option>)}</select></FormField></FormGrid><FormField label={L('Συνεισφέροντες παράγοντες','Contributing factors')}><textarea rows="4" value={form.contributingFactors||''} onChange={e=>setField('contributingFactors',e.target.value)}/></FormField><FormField label={L('Βασική αιτία / συμπέρασμα διερεύνησης','Root cause / investigation conclusion')}><textarea rows="4" value={form.rootCause||''} onChange={e=>setField('rootCause',e.target.value)}/></FormField><FormField label={L('Μάθηση / μέτρα πρόληψης επανάληψης','Lessons / recurrence prevention')}><textarea rows="4" value={form.lessonsLearned||''} onChange={e=>setField('lessonsLearned',e.target.value)}/></FormField></FormSection>
      </form>
    </Drawer>
  </PageChrome>
}
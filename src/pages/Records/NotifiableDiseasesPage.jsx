import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { AlertTriangle, CheckCircle2, Download, FileText, Plus, Printer, Trash2 } from 'lucide-react'
import HybridMultiSelector from '../../components/core/HybridMultiSelector/HybridMultiSelector'
import AttachmentManager from '../../components/core/AttachmentManager/AttachmentManager'
import {
  Badge,
  Button,
  Drawer,
  EntityCell,
  EntitySummary,
  FormActions,
  FormField,
  FormGrid,
  FormSection,
  LibraryField,
  ListWorkspace,
  PageChrome,
  PageHeader,
  StatCard,
} from '../../components/core'
import { normalizeText, selectedRows, sortRows } from '../../core/utils/entityList'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { EODY_DISEASES, loadNotifiableDiseases, NOTIFIABLE_DISEASES_EVENT } from '../../services/notifiableDiseasesService'
import { deleteClinicalNotifiableDisease, loadClinicalNotifiableDiseases, saveClinicalNotifiableDisease } from '../../services/backend/clinicalSupportBackendService'
import { loadPatientRegistry } from '../../services/patientService'
import { activeMasterItems } from '../../services/masterDataService'
import './RecordsUnified.css'

const EMPTY = { disease:'', deadline:'', patientName:'', patientCode:'', department:'', diagnosisDate:'', declarationDate:'', status:'Πρόχειρο', caseClassification:'Ύποπτο', physician:'', notes:'', attachments:[], history:[] }
const STATUS = ['Πρόχειρο','Προς δήλωση','Δηλώθηκε','Ακυρώθηκε']

function formatDate(value){ return value ? new Date(`${value}T12:00:00`).toLocaleDateString('el-GR') : '—' }
function makeId(items){ const year=new Date().getFullYear(); return `YDN-${year}-${String(items.length+1).padStart(4,'0')}` }
function statusTone(value){ if(value==='Δηλώθηκε') return 'success'; if(value==='Προς δήλωση') return 'warning'; if(value==='Ακυρώθηκε') return 'neutral'; return 'info' }
function deadlineTone(value){ return value==='Αμέσως' ? 'danger' : value==='24ωρο' ? 'warning' : 'neutral' }

const exportColumns = [
  { label:'Κωδικός', value:(row)=>row.id||'' },
  { label:'Νόσημα', value:(row)=>row.disease||'' },
  { label:'Ασθενής', value:(row)=>row.patientName||'' },
  { label:'Κωδικός ασθενούς', value:(row)=>row.patientCode||'' },
  { label:'Τμήμα', value:(row)=>row.department||'' },
  { label:'Ημερομηνία διάγνωσης', value:(row)=>row.diagnosisDate||'' },
  { label:'Χρόνος δήλωσης', value:(row)=>row.deadline||'' },
  { label:'Κατάσταση', value:(row)=>row.status||'' },
]

export default function NotifiableDiseasesPage(){
  const [items,setItems]=useState(loadNotifiableDiseases)
  const [search,setSearch]=useState('')
  const [status,setStatus]=useState('')
  const [deadline,setDeadline]=useState('')
  const [sort,setSort]=useState({key:'diagnosisDate',direction:'desc'})
  const [selectedKeys,setSelectedKeys]=useState([])
  const [drawerOpen,setDrawerOpen]=useState(false)
  const [selectedId,setSelectedId]=useState(null)
  const [draft,setDraft]=useState(EMPTY)
  const [patientSelection,setPatientSelection]=useState([])
  const patients=useMemo(()=>loadPatientRegistry(),[])
  const diseaseLibrary=useMemo(()=>{const rows=activeMasterItems('notifiable-diseases');return rows.length?rows:EODY_DISEASES},[])

  async function refreshDiseases(){setItems(await loadClinicalNotifiableDiseases())}
  useEffect(()=>{refreshDiseases().catch(()=>{})},[])
  useAppEvents(NOTIFIABLE_DISEASES_EVENT, () => {refreshDiseases().catch(()=>{})})

  const filtered=useMemo(()=>{
    const query=normalizeText(search)
    return sortRows(items.filter(item=>{
      const haystack=normalizeText([item.id,item.disease,item.patientName,item.patientCode,item.department,item.physician].filter(Boolean).join(' '))
      return (!query||haystack.includes(query))&&(!status||item.status===status)&&(!deadline||item.deadline===deadline)
    }),sort)
  },[items,search,status,deadline,sort])

  const selectedItems=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const summary=useMemo(()=>({
    total:items.length,
    pending:items.filter(x=>x.status==='Προς δήλωση').length,
    immediate:items.filter(x=>x.deadline==='Αμέσως'&&x.status!=='Δηλώθηκε'&&x.status!=='Ακυρώθηκε').length,
    declared:items.filter(x=>x.status==='Δηλώθηκε').length,
  }),[items])

  function openNew(){ setSelectedId(null); setDraft({...EMPTY}); setPatientSelection([]); setDrawerOpen(true) }
  function openItem(item){ setSelectedId(item.id); setDraft(structuredClone(item)); setPatientSelection([]); setDrawerOpen(true) }
  function close(){ setDrawerOpen(false); setSelectedId(null); setDraft(EMPTY) }
  function update(name,value){ setDraft(current=>({...current,[name]:value})) }
  function diseaseChanged(value){ const match=diseaseLibrary.find(item=>item.name===value); setDraft(current=>({...current,disease:value,deadline:match?.deadline||''})) }
  async function save(event){
    event.preventDefault()
    if(!draft.disease||!draft.patientName){ notifyAction('Συμπληρώστε νόσημα και ασθενή.'); return }
    const now=new Date().toISOString()
    const next={...draft,id:selectedId||draft.id||makeId(items),history:[...(draft.history||[]),{id:`h-${Date.now()}`,at:now,text:selectedId?'Ενημέρωση δήλωσης':'Δημιουργία δήλωσης'}]}
    await saveClinicalNotifiableDisease(next); setItems(await loadClinicalNotifiableDiseases()); close()
  }
  async function remove(){
    if(!selectedId||!confirmAction('Να διαγραφεί η δήλωση;')) return
    await deleteClinicalNotifiableDisease(selectedId); setItems(await loadClinicalNotifiableDiseases()); close()
  }
  function markDeclared(){ setDraft(current=>({...current,status:'Δηλώθηκε',declarationDate:new Date().toISOString().slice(0,10)})) }
  function clearFilters(){ setSearch(''); setStatus(''); setDeadline('') }
  function exportSelected(){ downloadCsv({filename:`diloumena-nosimata-${new Date().toISOString().slice(0,10)}.csv`,columns:exportColumns,rows:selectedItems}) }
  function printSelected(){ printRows({title:'Υποχρεωτικώς Δηλούμενα Νοσήματα',columns:exportColumns,rows:selectedItems}) }

  const columns=[
    {key:'id',label:'Κωδικός',sortable:true,width:'145px',render:(row)=><EntityCell primary={row.id} secondary={row.patientCode||'Χωρίς κωδικό ασθενούς'}/>},
    {key:'disease',label:'Νόσημα',sortable:true,render:(row)=><EntityCell primary={row.disease} secondary={row.caseClassification}/>},
    {key:'patientName',label:'Ασθενής',sortable:true,render:(row)=><EntityCell primary={row.patientName} secondary={row.department||'Χωρίς τμήμα'}/>},
    {key:'diagnosisDate',label:'Διάγνωση',sortable:true,width:'135px',render:(row)=>formatDate(row.diagnosisDate)},
    {key:'deadline',label:'Χρόνος',sortable:true,width:'120px',render:(row)=><Badge tone={deadlineTone(row.deadline)}>{row.deadline||'—'}</Badge>},
    {key:'status',label:'Κατάσταση',sortable:true,width:'140px',render:(row)=><Badge tone={statusTone(row.status)}>{row.status}</Badge>},
  ]

  return <PageChrome className="records-unified-page" header={<PageHeader title="Υποχρεωτικώς Δηλούμενα Νοσήματα" description="Καταγραφή, προθεσμία και τεκμηρίωση δήλωσης προς τον ΕΟΔΥ." actions={<Button icon={<Plus size={17}/>} onClick={openNew}>Νέα δήλωση</Button>}/> }>
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel="Σύνολα δηλώσεων"><StatCard compact icon={FileText} label="Σύνολο" value={summary.total}/><StatCard compact label="Προς δήλωση" value={summary.pending} tone={summary.pending?'warning':'default'}/><StatCard compact icon={AlertTriangle} label="Άμεσης δήλωσης" value={summary.immediate} tone={summary.immediate?'danger':'default'}/><StatCard compact icon={CheckCircle2} label="Δηλώθηκαν" value={summary.declared} tone="success"/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση νοσήματος, ασθενή ή τμήματος…"
      activeFilterCount={[search,status,deadline].filter(Boolean).length} onClearFilters={clearFilters}
      filters={<><select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Κατάσταση"><option value="">Όλες οι καταστάσεις</option>{STATUS.map(x=><option key={x}>{x}</option>)}</select><select value={deadline} onChange={e=>setDeadline(e.target.value)} aria-label="Χρόνος δήλωσης"><option value="">Όλοι οι χρόνοι δήλωσης</option><option>Αμέσως</option><option>24ωρο</option><option>Εβδομάδα</option></select></>}
      selectedCount={selectedItems.length} selectedLabel="δηλώσεις" onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>Εξαγωγή CSV</Button></>}
      columns={columns} rows={filtered} getRowKey={row=>row.id} onRowClick={openItem} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort}
      ariaLabel="Υποχρεωτικώς Δηλούμενα Νοσήματα" footer={<span>{filtered.length} εγγραφές</span>} emptyTitle="Δεν βρέθηκαν δηλώσεις"
    />

    <Drawer open={drawerOpen} onClose={close} title={selectedId?'Επεξεργασία δήλωσης':'Νέα δήλωση'} description={draft.disease||'Συμπληρώστε τα στοιχεία της δήλωσης.'} width={1120} position="center"
      footer={<FormActions form="notifiable-disease-form" onCancel={close} extraActions={<>{selectedId&&<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή</Button>}{draft.status!=='Δηλώθηκε'&&<Button variant="secondary" icon={<CheckCircle2 size={16}/>} onClick={markDeclared}>Σήμανση ως δηλωμένο</Button>}</>}/>}>
      <form id="notifiable-disease-form" className="records-unified-form" onSubmit={save}>
        <FormSection title="Στοιχεία δήλωσης">
          <FormGrid columns={3}>
            <FormField label="Νόσημα" required fullWidth><select value={draft.disease} onChange={e=>diseaseChanged(e.target.value)}><option value="">Επιλέξτε νόσημα</option>{diseaseLibrary.map(item=><option key={item.name}>{item.name}</option>)}</select></FormField>
            <FormField label="Χρόνος δήλωσης"><input value={draft.deadline} readOnly/></FormField>
            <FormField label="Κατάσταση"><select value={draft.status} onChange={e=>update('status',e.target.value)}>{STATUS.map(x=><option key={x}>{x}</option>)}</select></FormField>
            <FormField label="Ταξινόμηση κρούσματος"><select value={draft.caseClassification} onChange={e=>update('caseClassification',e.target.value)}><option>Ύποπτο</option><option>Πιθανό</option><option>Επιβεβαιωμένο</option></select></FormField>
            <FormField label="Ημερομηνία διάγνωσης"><input type="date" value={draft.diagnosisDate} onChange={e=>update('diagnosisDate',e.target.value)}/></FormField>
            <FormField label="Ημερομηνία δήλωσης"><input type="date" value={draft.declarationDate} onChange={e=>update('declarationDate',e.target.value)}/></FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="Ασθενής & υπεύθυνος">
          {!selectedId&&<HybridMultiSelector items={patients} selected={patientSelection} onChange={value=>{const one=value.slice(-1);setPatientSelection(one);const subject=one[0];if(subject){const source=subject.source||subject;const values=subject.values||{};setDraft(current=>({...current,patientId:subject.manual?'':subject.id,patientName:subject.name||source.fullName||'',patientCode:source.patientCode||values.code||'',department:source.department||values.department||''}))}}} label="Ασθενής *" getName={item=>item.fullName||item.name||''} getMeta={item=>[item.patientCode,item.department].filter(Boolean).join(' · ')} manualFields={[{key:'name',label:'Ονοματεπώνυμο',required:true},{key:'code',label:'Κωδικός ασθενούς'},{key:'department',label:'Τμήμα'}]}/>}
          <FormGrid columns={3}>
            <FormField label="Ονοματεπώνυμο ασθενούς" required><input value={draft.patientName} onChange={e=>update('patientName',e.target.value)}/></FormField>
            <FormField label="Κωδικός ασθενούς"><input value={draft.patientCode} onChange={e=>update('patientCode',e.target.value)}/></FormField>
            <FormField label="Τμήμα"><LibraryField hideLabel libraryKey="departments" value={draft.department} onChange={value=>update('department',value)} placeholder="Επιλέξτε ή γράψτε τμήμα"/></FormField>
            <FormField label="Θεράπων / υπεύθυνος" fullWidth><input value={draft.physician} onChange={e=>update('physician',e.target.value)}/></FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="Σημειώσεις"><FormField><textarea rows="5" value={draft.notes} onChange={e=>update('notes',e.target.value)}/></FormField></FormSection>
        <FormSection title="Συνημμένα" description="Μπορούν να αποθηκευτούν πολλαπλά αρχεία ανά δήλωση."><AttachmentManager value={draft.attachments||[]} onChange={value=>update('attachments',value)}/></FormSection>
        {selectedId&&<FormSection title="Ιστορικό"><div className="records-unified-history">{(draft.history||[]).slice().reverse().map(entry=><article key={entry.id}><i/><div><strong>{entry.text}</strong><small>{new Date(entry.at).toLocaleString('el-GR')}</small></div></article>)}{!draft.history?.length&&<span>Δεν υπάρχει ιστορικό.</span>}</div></FormSection>}
      </form>
    </Drawer>
  </PageChrome>
}

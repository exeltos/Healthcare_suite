import { confirmAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useServiceCollection } from '../../core/hooks'
import { CheckCircle2, Clock3, Download, Pill, Plus, Printer, Trash2, Users } from 'lucide-react'
import HybridMultiSelector from '../../components/core/HybridMultiSelector/HybridMultiSelector'
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
import { ANTIBIOTIC_OPTIONS, PROMOTED_APPROVAL_OPTIONS } from '../../core/constants/clinicalOptions'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { loadPatientRegistry } from '../../services/patientService'
import { deletePromotedAntibiotic, loadPromotedAntibiotics, PROMOTED_ANTIBIOTICS_EVENT, upsertPromotedAntibiotic } from '../../services/preventionService'
import { updateTherapyApproval } from '../../services/surveillanceCasesService'
import './PreventionUnified.css'
import { masterNames } from '../../services/masterDataService'

const EMPTY = { date:'', department:'', antibiotic:'', indication:'', approval:'Εκκρεμεί', doctor:'', approvalDate:'', notes:'' }
function displayDate(value) { if (!value) return '—'; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('el-GR') }
function approvalTone(value) { if (value === 'Εγκρίθηκε') return 'success'; if (value === 'Απορρίφθηκε') return 'danger'; return 'warning' }

const exportColumns = [
  { label:'Ημερομηνία', value:(row)=>row.date||'' }, { label:'Ασθενής', value:(row)=>row.patientName||'' }, { label:'Κωδικός', value:(row)=>row.patientCode||'' },
  { label:'Τμήμα', value:(row)=>row.department||'' }, { label:'Αντιβιοτικό', value:(row)=>row.antibiotic||'' }, { label:'Κατάσταση', value:(row)=>row.approval||'' }, { label:'Εγκρίνων ιατρός', value:(row)=>row.doctor||'' },
]

export default function PromotedAntibioticsPage(){
  const [records, refreshRecords, setRecords] = useServiceCollection(loadPromotedAntibiotics, PROMOTED_ANTIBIOTICS_EVENT)
  const [patients]=useState(loadPatientRegistry)
  const [search,setSearch]=useState('')
  const [department,setDepartment]=useState('')
  const [approval,setApproval]=useState('')
  const [sort,setSort]=useState({key:'date',direction:'desc'})
  const [selectedKeys,setSelectedKeys]=useState([])
  const [drawerOpen,setDrawerOpen]=useState(false)
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState(EMPTY)
  const [subjects,setSubjects]=useState([])

  

  const departments=masterNames('departments')
  const filtered=useMemo(()=>{ const query=normalizeText(search); return sortRows(records.filter(row=>(!department||row.department===department)&&(!approval||row.approval===approval)&&(!query||normalizeText([row.patientName,row.patientCode,row.department,row.antibiotic,row.doctor,row.indication].filter(Boolean).join(' ')).includes(query))),sort) },[records,search,department,approval,sort])
  const selectedRecords=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const metrics=useMemo(()=>({ total:filtered.length, pending:filtered.filter(x=>x.approval==='Εκκρεμεί').length, approved:filtered.filter(x=>x.approval==='Εγκρίθηκε').length, patients:new Set(filtered.map(x=>x.patientId||x.patientName).filter(Boolean)).size }),[filtered])

  function close(){setDrawerOpen(false);setEditing(null);setForm(EMPTY);setSubjects([])}
  function openNew(){setEditing(null);setForm(EMPTY);setSubjects([]);setDrawerOpen(true)}
  function openRecord(record){setEditing(record);setForm({...EMPTY,...record,doctor:record.doctor||'',approvalDate:record.approvalDate||''});setSubjects([]);setDrawerOpen(true)}
  function setField(name,value){setForm(current=>({...current,[name]:value}))}
  function save(event){
    event.preventDefault()
    if(editing){
      const updated=upsertPromotedAntibiotic({...editing,...form})
      if(updated.sourceType==='patient-therapy'&&updated.caseId&&updated.sourceId){updateTherapyApproval(updated.caseId,updated.sourceId,{approval:updated.approval,approvalDoctor:updated.doctor,approvalDate:updated.approvalDate,approvalNotes:updated.notes})}
      refreshRecords();close();return
    }
    if(!subjects.length||!form.date||!form.antibiotic)return
    subjects.forEach((subject)=>{const source=subject.source||{};const values=subject.values||{};upsertPromotedAntibiotic({...form,patientId:subject.manual?'':subject.id,patientName:subject.name,patientCode:source.patientCode||values.code||'',department:form.department||source.department||values.department||subject.meta||''})})
    refreshRecords();close()
  }
  function remove(){ if(!editing||!confirmAction('Να διαγραφεί η καταχώρηση;'))return; deletePromotedAntibiotic(editing.id); refreshRecords(); close() }
  function printSelected(){printRows({title:'Προωθημένα Αντιβιοτικά',columns:exportColumns,rows:selectedRecords})}
  function exportSelected(){downloadCsv({filename:`proothimena-antiviotika-${new Date().toISOString().slice(0,10)}.csv`,columns:exportColumns,rows:selectedRecords})}

  const columns=[
    {key:'date',label:'Ημερομηνία',width:'135px',sortable:true,render:(row)=>displayDate(row.date)},
    {key:'patientName',label:'Ασθενής',sortable:true,render:(row)=><EntityCell primary={row.patientName||'—'} secondary={row.patientCode||''}/>},
    {key:'department',label:'Τμήμα',sortable:true,render:(row)=>row.department||'—'},
    {key:'antibiotic',label:'Αντιβιοτικό',sortable:true,render:(row)=>row.antibiotic||'—'},
    {key:'approval',label:'Κατάσταση',width:'145px',sortable:true,render:(row)=><Badge tone={approvalTone(row.approval)}>{row.approval||'Εκκρεμεί'}</Badge>},
    {key:'doctor',label:'Εγκρίνων ιατρός',render:(row)=><EntityCell primary={row.doctor||'—'} secondary={row.approvalDate?displayDate(row.approvalDate):''}/>},
  ]

  return <PageChrome className="prevention-unified-page" header={<PageHeader title="Προωθημένα Αντιβιοτικά" description="Αιτήματα και εγκρίσεις αντιβιοτικών περιορισμένης χρήσης." actions={<Button icon={<Plus size={17}/>} onClick={openNew}>Νέα καταχώρηση</Button>}/> }>
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel="Σύνολα προωθημένων αντιβιοτικών"><StatCard compact icon={Pill} label="Αιτήματα" value={metrics.total}/><StatCard compact icon={Clock3} label="Εκκρεμή" value={metrics.pending}/><StatCard compact icon={CheckCircle2} label="Εγκεκριμένα" value={metrics.approved}/><StatCard compact icon={Users} label="Ασθενείς" value={metrics.patients}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση ασθενούς, αντιβιοτικού ή ιατρού…"
      activeFilterCount={[search,department,approval].filter(Boolean).length} onClearFilters={()=>{setSearch('');setDepartment('');setApproval('')}}
      filters={<><select value={department} onChange={e=>setDepartment(e.target.value)} aria-label="Τμήμα"><option value="">Όλα τα τμήματα</option>{departments.map(item=><option key={item}>{item}</option>)}</select><select value={approval} onChange={e=>setApproval(e.target.value)} aria-label="Κατάσταση"><option value="">Όλες οι καταστάσεις</option>{PROMOTED_APPROVAL_OPTIONS.map(item=><option key={item}>{item}</option>)}</select></>}
      selectedCount={selectedRecords.length} selectedLabel="αιτήματα" onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>Εξαγωγή CSV</Button></>}
      columns={columns} rows={filtered} getRowKey={row=>row.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel="Προωθημένα αντιβιοτικά" footer={<span>{filtered.length} εγγραφές</span>} emptyTitle="Δεν υπάρχουν αιτήματα"
    />

    <Drawer open={drawerOpen} onClose={close} title={editing?'Έγκριση προωθημένου αντιβιοτικού':'Νέα καταχώρηση προωθημένου αντιβιοτικού'} description={editing?.sourceType==='patient-therapy'?'Η αποθήκευση ενημερώνει αυτόματα την αντίστοιχη αγωγή στον φάκελο ασθενούς.':'Επιλέξτε ασθενή από το μητρώο ή καταχωρήστε χειροκίνητα.'} width={1080} position="center" footer={<FormActions form="promoted-antibiotic-form" onCancel={close} saveLabel={editing&&form.approval==='Εγκρίθηκε'?'Αποθήκευση έγκρισης':(!editing&&subjects.length>1?`Αποθήκευση (${subjects.length})`:'Αποθήκευση')} extraActions={editing?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή</Button>:null}/> }>
      <form id="promoted-antibiotic-form" className="prevention-unified-form" onSubmit={save}>
        {!editing&&<FormSection title="Ασθενείς"><HybridMultiSelector items={patients} selected={subjects} onChange={setSubjects} label="Ασθενείς *" getName={(item)=>item.fullName||item.name||''} getMeta={(item)=>[item.patientCode,item.department].filter(Boolean).join(' · ')} manualFields={[{key:'name',label:'Ονοματεπώνυμο',required:true},{key:'code',label:'Κωδικός ασθενούς'},{key:'department',label:'Τμήμα'}]}/></FormSection>}
        {editing&&<FormSection title="Ασθενής"><FormGrid columns={2}><FormField label="Ονοματεπώνυμο"><input disabled value={editing.patientName||''}/></FormField><FormField label="Κωδικός"><input disabled value={editing.patientCode||''}/></FormField></FormGrid></FormSection>}
        <FormSection title="Αίτημα"><FormGrid columns={2}>
          <FormField label="Ημερομηνία" required><input required type="date" value={form.date} onChange={e=>setField('date',e.target.value)}/></FormField>
          <FormField label="Τμήμα"><LibraryField hideLabel libraryKey="departments" value={form.department} onChange={value=>setField('department',value)} placeholder="Επιλέξτε ή γράψτε τμήμα"/></FormField>
          <FormField label="Αντιβιοτικό" required><select required disabled={Boolean(editing?.sourceType==='patient-therapy')} value={form.antibiotic} onChange={e=>setField('antibiotic',e.target.value)}><option value="">Επιλογή</option>{ANTIBIOTIC_OPTIONS.map(item=><option key={item} value={item}>{item}</option>)}</select></FormField>
          <FormField label="Κατάσταση έγκρισης"><select value={form.approval} onChange={e=>setField('approval',e.target.value)}>{PROMOTED_APPROVAL_OPTIONS.map(item=><option key={item}>{item}</option>)}</select></FormField>
        </FormGrid></FormSection>
        <FormSection title="Έγκριση"><FormGrid columns={2}><FormField label="Εγκρίνων ιατρός"><input value={form.doctor} onChange={e=>setField('doctor',e.target.value)}/></FormField><FormField label="Ημερομηνία έγκρισης"><input type="date" value={form.approvalDate||''} onChange={e=>setField('approvalDate',e.target.value)}/></FormField></FormGrid></FormSection>
        <FormSection title="Κλινική τεκμηρίωση"><FormGrid columns={1}><FormField label="Ένδειξη"><textarea rows="4" value={form.indication} onChange={e=>setField('indication',e.target.value)}/></FormField><FormField label="Σημειώσεις έγκρισης"><textarea rows="4" value={form.notes} onChange={e=>setField('notes',e.target.value)}/></FormField></FormGrid></FormSection>
      </form>
    </Drawer>
  </PageChrome>
}
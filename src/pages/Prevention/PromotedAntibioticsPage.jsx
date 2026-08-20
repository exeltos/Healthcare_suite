import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useServiceCollection } from '../../core/hooks'
import { CheckCircle2, Clock3, Download, Pill, Plus, Printer, Trash2, Users } from 'lucide-react'
import HybridMultiSelector from '../../components/core/HybridMultiSelector/HybridMultiSelector'
import {
  Badge,
  Button,
  DateField,
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
  Tabs,
} from '../../components/core'
import { PROMOTED_APPROVAL_OPTIONS } from '../../core/constants/clinicalOptions'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { loadPatientRegistry } from '../../services/patientService'
import { loadPromotedAntibiotics, PROMOTED_ANTIBIOTICS_EVENT } from '../../services/preventionService'
import { deletePreventionRecord, loadPreventionRecords, savePreventionRecord } from '../../services/backend/preventionBackendService'
import { updateTherapyApproval, getSurveillanceCase } from '../../services/surveillanceCasesService'
import { saveClinicalSurveillanceCase } from '../../services/backend/clinicalDirectoryService'
import './PreventionUnified.css'
import { activeMasterItems, masterNames } from '../../services/masterDataService'
import { useI18n } from '../../i18n'
import { APP_ROUTES } from '../../config/routes'
import '../Surveillance/AntimicrobialSurveillance.css'
import { preventionDisplayValue } from './preventionPresentation'

const EMPTY = { date:'', department:'', antibiotic:'', indication:'', approval:'Εκκρεμεί', doctor:'', approvalDate:'', notes:'' }
function displayDate(value,language='el') { if (!value) return '—'; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(language==='en'?'en-GB':'el-GR') }
function approvalTone(value) { if (value === 'Εγκρίθηκε') return 'success'; if (value === 'Απορρίφθηκε') return 'danger'; return 'warning' }

const buildExportColumns = (L) => [
  { label:L('Ημερομηνία','Date'), value:(row)=>row.date||'' }, { label:L('Ασθενής','Patient'), value:(row)=>row.patientName||'' }, { label:'Κωδικός', value:(row)=>row.patientCode||'' },
  { label:L('Τμήμα','Department'), value:(row)=>row.department||'' }, { label:L('Αντιβιοτικό','Antimicrobial'), value:(row)=>row.antibiotic||'' }, { label:L('Κατάσταση','Status'), value:(row)=>row.approval||'' }, { label:L('Εγκρίνων ιατρός','Approving physician'), value:(row)=>row.doctor||'' },
]

export default function PromotedAntibioticsPage(){
  const { language } = useI18n()
  const L = (el,en) => language === 'en' ? en : el
  const navigate = useNavigate()
  const exportColumns = buildExportColumns(L)
  const [records, refreshRecords, setRecords] = useServiceCollection(loadPromotedAntibiotics, PROMOTED_ANTIBIOTICS_EVENT)
  useEffect(()=>{loadPreventionRecords('promoted_antibiotic').then(setRecords).catch(()=>{})},[])
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
  const restrictedAntibiotics = useMemo(() => activeMasterItems('antibiotics').filter((item) => item.restricted === true), [])
  const restrictedAntibioticNames = useMemo(() => restrictedAntibiotics.map((item) => item.name), [restrictedAntibiotics])
  const antibioticChoices = useMemo(() => {
    const names = [...restrictedAntibioticNames]
    if (editing?.antibiotic && !names.includes(editing.antibiotic)) names.unshift(editing.antibiotic)
    return names
  }, [restrictedAntibioticNames, editing?.antibiotic])
  const filtered=useMemo(()=>{ const query=normalizeText(search); return sortRows(records.filter(row=>(!department||row.department===department)&&(!approval||row.approval===approval)&&(!query||normalizeText([row.patientName,row.patientCode,row.department,row.antibiotic,row.doctor,row.indication].filter(Boolean).join(' ')).includes(query))),sort) },[records,search,department,approval,sort])
  const selectedRecords=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const metrics=useMemo(()=>({ total:filtered.length, pending:filtered.filter(x=>x.approval==='Εκκρεμεί').length, approved:filtered.filter(x=>x.approval==='Εγκρίθηκε').length, patients:new Set(filtered.map(x=>x.patientId||x.patientName).filter(Boolean)).size }),[filtered])

  function close(){setDrawerOpen(false);setEditing(null);setForm(EMPTY);setSubjects([])}
  function openNew(){setEditing(null);setForm(EMPTY);setSubjects([]);setDrawerOpen(true)}
  function openRecord(record){setEditing(record);setForm({...EMPTY,...record,doctor:record.doctor||'',approvalDate:record.approvalDate||''});setSubjects([]);setDrawerOpen(true)}
  function setField(name,value){setForm(current=>({...current,[name]:value}))}
  async function save(event){
    event.preventDefault()
    if(form.approval==='Εγκρίθηκε' && (!String(form.doctor||'').trim() || !form.approvalDate)){
      notifyAction(L('Για εγκεκριμένο αίτημα απαιτούνται εγκρίνων ιατρός και ημερομηνία έγκρισης.','Approved requests require an approving physician and approval date.'))
      return
    }
    const normalizedForm = form.approval === 'Εκκρεμεί' ? {...form, doctor:'', approvalDate:''} : form
    if(editing){
      const updated=await savePreventionRecord('promoted_antibiotic',{...editing,...normalizedForm})
      if(updated.sourceType==='patient-therapy'&&updated.caseId&&updated.sourceId){
        updateTherapyApproval(updated.caseId,updated.sourceId,{approval:updated.approval,approvalDoctor:updated.doctor,approvalDate:updated.approvalDate,approvalNotes:updated.notes})
        const linkedCase=getSurveillanceCase(updated.caseId)
        if(linkedCase) await saveClinicalSurveillanceCase(linkedCase)
      }
      refreshRecords();close();return
    }
    if(!subjects.length||!form.date||!form.antibiotic)return
    for(const subject of subjects){const source=subject.source||{};const values=subject.values||{};await savePreventionRecord('promoted_antibiotic',{...normalizedForm,patientId:subject.manual?'':subject.id,patientName:subject.name,patientCode:source.patientCode||values.code||'',department:form.department||source.department||values.department||subject.meta||''})}
    refreshRecords();close()
  }
  async function remove(){ if(!editing||!confirmAction(L('Να διαγραφεί η καταχώρηση;','Delete this record?')))return; await deletePreventionRecord('promoted_antibiotic',editing.id); setRecords(await loadPreventionRecords('promoted_antibiotic')); close() }
  function printSelected(){printRows({title:L('Προωθημένα Αντιβιοτικά','Restricted Antibiotics'),columns:exportColumns,rows:selectedRecords})}
  function exportSelected(){downloadCsv({filename:`proothimena-antiviotika-${new Date().toISOString().slice(0,10)}.csv`,columns:exportColumns,rows:selectedRecords})}

  const columns=[
    {key:'date',label:L('Ημερομηνία','Date'),width:'135px',sortable:true,render:(row)=>displayDate(row.date,language)},
    {key:'patientName',label:L('Ασθενής','Patient'),sortable:true,render:(row)=><EntityCell primary={row.patientName||'—'} secondary={row.patientCode||''}/>},
    {key:'department',label:L('Τμήμα','Department'),sortable:true,render:(row)=>row.department||'—'},
    {key:'antibiotic',label:L('Αντιβιοτικό','Antimicrobial'),sortable:true,render:(row)=>row.antibiotic||'—'},
    {key:'approval',label:L('Κατάσταση','Status'),width:'145px',sortable:true,render:(row)=><Badge tone={approvalTone(row.approval)}>{preventionDisplayValue(row.approval||'Εκκρεμεί',language)}</Badge>},
    {key:'doctor',label:L('Εγκρίνων ιατρός','Approving physician'),render:(row)=><EntityCell primary={row.doctor||'—'} secondary={row.approvalDate?displayDate(row.approvalDate,language):''}/>},
  ]

  return <PageChrome className="prevention-unified-page" header={<PageHeader title={L("Αντιμικροβιακή Επιτήρηση","Antimicrobial Surveillance")} description={L("Έγκριση περιορισμένης χρήσης και επιτήρηση κατανάλωσης με ATC/DDD.","Restricted-use approval and ATC/DDD consumption surveillance.")} actions={<Button icon={<Plus size={17}/>} onClick={openNew}>{L('Νέα καταχώρηση','New record')}</Button>}/> }>
    <Tabs
      variant="clinical"
      ariaLabel={L('Αντιμικροβιακή επιτήρηση','Antimicrobial surveillance')}
      value="restricted"
      onChange={(value)=>{ if(value==='consumption') navigate(APP_ROUTES.ANTIMICROBIAL_CONSUMPTION) }}
      items={[
        {id:'restricted',label:L('Προωθημένα Αντιβιοτικά','Restricted Antibiotics')},
        {id:'consumption',label:L('Κατανάλωση Αντιμικροβιακών','Antimicrobial Consumption')},
      ]}
    />
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel={L("Σύνολα προωθημένων αντιβιοτικών","Restricted antibiotic totals")}><StatCard compact icon={Pill} label={L("Αιτήματα","Requests")} value={metrics.total}/><StatCard compact icon={Clock3} label={L("Εκκρεμή","Pending")} value={metrics.pending}/><StatCard compact icon={CheckCircle2} label={L("Εγκεκριμένα","Approved")} value={metrics.approved}/><StatCard compact icon={Users} label={L("Ασθενείς","Patients")} value={metrics.patients}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder={L("Αναζήτηση ασθενούς, αντιβιοτικού ή ιατρού…","Search patient, antimicrobial or physician…")}
      activeFilterCount={[search,department,approval].filter(Boolean).length} onClearFilters={()=>{setSearch('');setDepartment('');setApproval('')}}
      filters={<><select value={department} onChange={e=>setDepartment(e.target.value)} aria-label={L("Τμήμα","Department")}><option value="">{L('Όλα τα τμήματα','All departments')}</option>{departments.map(item=><option key={item}>{item}</option>)}</select><select value={approval} onChange={e=>setApproval(e.target.value)} aria-label={L("Κατάσταση","Status")}><option value="">{L('Όλες οι καταστάσεις','All statuses')}</option>{PROMOTED_APPROVAL_OPTIONS.map(item=><option key={item} value={item}>{preventionDisplayValue(item,language)}</option>)}</select></>}
      selectedCount={selectedRecords.length} selectedLabel={L("αιτήματα","requests")} onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>{L('Εκτύπωση / PDF','Print / PDF')}</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>{L('Εξαγωγή CSV','Export CSV')}</Button></>}
      columns={columns} rows={filtered} getRowKey={row=>row.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel={L("Προωθημένα αντιβιοτικά","Restricted antibiotics")} footer={<span>{filtered.length} {L('εγγραφές','records')}</span>} emptyTitle={L("Δεν υπάρχουν αιτήματα","No requests")}
    />

    <Drawer open={drawerOpen} onClose={close} title={editing?L('Έγκριση προωθημένου αντιβιοτικού','Restricted antibiotic approval'):L('Νέα καταχώρηση προωθημένου αντιβιοτικού','New restricted antibiotic record')} description={editing?.sourceType==='patient-therapy'?L('Η αποθήκευση ενημερώνει αυτόματα την αντίστοιχη αγωγή στον φάκελο ασθενούς.','Saving updates the corresponding therapy in the patient record automatically.'):L('Επιλέξτε ασθενή από το μητρώο ή καταχωρήστε χειροκίνητα.','Select a patient from the registry or enter manually.')} width={1080} position="center" footer={<FormActions form="promoted-antibiotic-form" onCancel={close} saveLabel={editing&&form.approval==='Εγκρίθηκε'?L('Αποθήκευση έγκρισης','Save approval'):(!editing&&subjects.length>1?`${L('Αποθήκευση','Save')} (${subjects.length})`:L('Αποθήκευση','Save'))} extraActions={editing?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>{L('Διαγραφή','Delete')}</Button>:null}/> }>
      <form id="promoted-antibiotic-form" className="prevention-unified-form" onSubmit={save}>
        {!editing&&<FormSection title={L("Ασθενείς","Patients")}><HybridMultiSelector items={patients} selected={subjects} onChange={setSubjects} label={L("Ασθενείς *","Patients *")} getName={(item)=>item.fullName||item.name||''} getMeta={(item)=>[item.patientCode,item.department].filter(Boolean).join(' · ')} manualFields={[{key:'name',label:L('Ονοματεπώνυμο','Full name'),required:true},{key:'code',label:L('Κωδικός ασθενούς','Patient code')},{key:'department',label:L('Τμήμα','Department')}]}/></FormSection>}
        {editing&&<FormSection title={L('Ασθενής','Patient')}><FormGrid columns={2}><FormField label={L("Ονοματεπώνυμο","Full name")}><input disabled value={editing.patientName||''}/></FormField><FormField label={L("Κωδικός","Code")}><input disabled value={editing.patientCode||''}/></FormField></FormGrid></FormSection>}
        <FormSection title={L("Αίτημα","Request")}><FormGrid columns={2}>
          <FormField label={L("Ημερομηνία","Date")} required><DateField hideLabel required value={form.date} onChange={e=>setField('date',e.target.value)}/></FormField>
          <FormField label={L("Τμήμα","Department")}><LibraryField hideLabel libraryKey="departments" value={form.department} onChange={value=>setField('department',value)} placeholder={L("Επιλέξτε ή γράψτε τμήμα","Select or enter department")}/></FormField>
          <FormField label={L("Αντιβιοτικό","Antimicrobial")} required><LibraryField hideLabel libraryKey="antibiotics" value={form.antibiotic} disabled={Boolean(editing?.sourceType==='patient-therapy')} allowManual={!editing?.sourceType} placeholder={L('Επιλογή','Select')} onChange={value=>setField('antibiotic',value)}/></FormField>
          <FormField label={L("Κατάσταση έγκρισης","Approval status")}><select value={form.approval} onChange={e=>setField('approval',e.target.value)}>{PROMOTED_APPROVAL_OPTIONS.map(item=><option key={item} value={item}>{preventionDisplayValue(item,language)}</option>)}</select></FormField>
        </FormGrid></FormSection>
        {form.approval !== 'Εκκρεμεί' && <FormSection title={form.approval === 'Εγκρίθηκε' ? L("Έγκριση","Approval") : L("Απόφαση","Decision")}><FormGrid columns={2}><FormField label={form.approval === 'Εγκρίθηκε' ? L("Εγκρίνων ιατρός","Approving physician") : L("Ιατρός απόφασης","Decision physician")} required={form.approval === 'Εγκρίθηκε'}><input required={form.approval === 'Εγκρίθηκε'} value={form.doctor} onChange={e=>setField('doctor',e.target.value)}/></FormField><FormField label={form.approval === 'Εγκρίθηκε' ? L("Ημερομηνία έγκρισης","Approval date") : L("Ημερομηνία απόφασης","Decision date")} required={form.approval === 'Εγκρίθηκε'}><DateField hideLabel required={form.approval === 'Εγκρίθηκε'} value={form.approvalDate||''} onChange={e=>setField('approvalDate',e.target.value)}/></FormField></FormGrid></FormSection>}
        <FormSection title={L("Κλινική τεκμηρίωση","Clinical documentation")}><FormGrid columns={1}><FormField label={L("Ένδειξη","Indication")}><textarea rows="4" value={form.indication} onChange={e=>setField('indication',e.target.value)}/></FormField><FormField label={L("Σημειώσεις έγκρισης","Approval notes")}><textarea rows="4" value={form.notes} onChange={e=>setField('notes',e.target.value)}/></FormField></FormGrid></FormSection>
      </form>
    </Drawer>
  </PageChrome>
}
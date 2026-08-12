import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useServiceCollection } from '../../core/hooks'
import { Boxes, Download, Gauge, Plus, Printer, Recycle, Trash2, Weight } from 'lucide-react'
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
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { WASTE_MEASUREMENTS_EVENT, deleteWasteMeasurement, loadWasteMeasurements, upsertWasteMeasurement } from '../../services/preventionService'
import '../Records/RecordsUnified.css'
import { masterNames } from '../../services/masterDataService'

const EMPTY_RECORD={date:'',department:'',wasteType:'',weightKg:'',containers:'',patientDays:'',collectionCompany:'',documentNumber:'',responsible:'',notes:''}
function number(value){const parsed=Number(String(value??'').replace(',','.'));return Number.isFinite(parsed)?parsed:0}
function formatNumber(value,digits=0){return Number(value||0).toLocaleString('el-GR',{minimumFractionDigits:digits,maximumFractionDigits:digits})}
function greekToIso(value){if(!value)return'';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const[day,month,year]=String(value).split('/');return year?`${year}-${month}-${day}`:''}
function isoToGreek(value){if(!value)return'';const[year,month,day]=String(value).split('-');return day?`${day}/${month}/${year}`:value}
function todayGreek(){return isoToGreek(new Date().toISOString().slice(0,10))}
function recordIndicator(record){const days=number(record.patientDays);return days>0?(number(record.weightKg)/days)*1000:0}
function isHazardous(value){return /επικίνδ|εααμ|μεα|αεα|αιχμηρ/i.test(String(value||''))}

const exportColumns=[
  {label:'Ημερομηνία',value:(row)=>row.date||''},{label:'Τμήμα',value:(row)=>row.department||''},{label:'Κατηγορία',value:(row)=>row.wasteType||''},{label:'Βάρος (kg)',value:(row)=>row.weightKg||''},
  {label:'Περιέκτες',value:(row)=>row.containers||''},{label:'Ημέρες νοσηλείας',value:(row)=>row.patientDays||''},{label:'Δείκτης kg/1.000',value:(row)=>recordIndicator(row).toFixed(1)},{label:'Εταιρεία αποκομιδής',value:(row)=>row.collectionCompany||''},{label:'Παραστατικό',value:(row)=>row.documentNumber||''},
]

export default function WasteMeasurementsPage(){
  const [records, refreshRecords, setRecords] = useServiceCollection(loadWasteMeasurements, WASTE_MEASUREMENTS_EVENT)
  const [search,setSearch]=useState('')
  const [departmentFilter,setDepartmentFilter]=useState('')
  const [typeFilter,setTypeFilter]=useState('')
  const [dateFrom,setDateFrom]=useState('')
  const [dateTo,setDateTo]=useState('')
  const [sort,setSort]=useState({key:'department',direction:'asc'})
  const [selectedKeys,setSelectedKeys]=useState([])
  const [drawerOpen,setDrawerOpen]=useState(false)
  const [selectedId,setSelectedId]=useState(null)
  const [formData,setFormData]=useState(EMPTY_RECORD)

  
  const departments=masterNames('departments')
  const wasteTypes=useMemo(()=>uniqueSortedValues(records,row=>row.wasteType),[records])
  const filtered=useMemo(()=>{const query=normalizeText(search);return sortRows(records.filter(record=>{if(departmentFilter&&record.department!==departmentFilter)return false;if(typeFilter&&record.wasteType!==typeFilter)return false;const recordDate=greekToIso(record.date);if(dateFrom&&recordDate&&recordDate<dateFrom)return false;if(dateTo&&recordDate&&recordDate>dateTo)return false;return !query||normalizeText([record.date,record.department,record.wasteType,record.collectionCompany,record.documentNumber,record.responsible].filter(Boolean).join(' ')).includes(query)}),sort)},[records,search,departmentFilter,typeFilter,dateFrom,dateTo,sort])
  const selectedRecords=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const metrics=useMemo(()=>{const totalWeight=filtered.reduce((sum,item)=>sum+number(item.weightKg),0);const totalContainers=filtered.reduce((sum,item)=>sum+number(item.containers),0);const totalPatientDays=filtered.reduce((sum,item)=>sum+number(item.patientDays),0);const hazardousWeight=filtered.filter(item=>isHazardous(item.wasteType)).reduce((sum,item)=>sum+number(item.weightKg),0);return{totalWeight,totalContainers,indicator:totalPatientDays>0?(totalWeight/totalPatientDays)*1000:0,hazardousPercent:totalWeight>0?(hazardousWeight/totalWeight)*100:0}},[filtered])

  function openNew(){setSelectedId(null);setFormData({...EMPTY_RECORD,date:todayGreek()});setDrawerOpen(true)}
  function openRecord(record){setSelectedId(record.id);setFormData({...EMPTY_RECORD,...record});setDrawerOpen(true)}
  function close(){setDrawerOpen(false);setSelectedId(null);setFormData(EMPTY_RECORD)}
  function setField(name,value){setFormData(current=>({...current,[name]:value}))}
  function save(event){event.preventDefault();if(!formData.date||!formData.department||!formData.wasteType||number(formData.weightKg)<=0){notifyAction('Συμπληρώστε ημερομηνία, τμήμα, κατηγορία και βάρος.');return}upsertWasteMeasurement({...formData,id:selectedId||`WASTE-${Date.now()}`,weightKg:String(number(formData.weightKg)),containers:formData.containers===''?'':String(number(formData.containers)),patientDays:formData.patientDays===''?'':String(number(formData.patientDays)),indicator:recordIndicator(formData),updatedAt:new Date().toISOString()});refreshRecords();close()}
  function remove(){if(!selectedId||!confirmAction('Να διαγραφεί η μέτρηση αποβλήτων;'))return;deleteWasteMeasurement(selectedId);refreshRecords();close()}
  function clearFilters(){setSearch('');setDepartmentFilter('');setTypeFilter('');setDateFrom('');setDateTo('')}
  function exportSelected(){downloadCsv({filename:`apovlita-${new Date().toISOString().slice(0,10)}.csv`,columns:exportColumns,rows:selectedRecords})}
  function printSelected(){printRows({title:'Μετρήσεις Αποβλήτων',columns:exportColumns,rows:selectedRecords})}

  const columns=[
    {key:'date',label:'Ημερομηνία',width:'130px',render:(row)=>row.date||'—'},
    {key:'department',label:'Τμήμα',sortable:true,render:(row)=><EntityCell primary={row.department} secondary={row.responsible||'Χωρίς υπεύθυνο'}/>},
    {key:'wasteType',label:'Κατηγορία',sortable:true,render:(row)=><Badge tone={isHazardous(row.wasteType)?'warning':'neutral'}>{row.wasteType||'—'}</Badge>},
    {key:'weightKg',label:'Βάρος',width:'110px',render:(row)=>`${formatNumber(number(row.weightKg),1)} kg`},
    {key:'containers',label:'Περιέκτες',width:'110px',render:(row)=>row.containers===''?'—':formatNumber(number(row.containers),0)},
    {key:'indicator',label:'Δείκτης',width:'135px',render:(row)=>`${formatNumber(recordIndicator(row),1)} kg / 1.000`},
  ]

  return <PageChrome className="records-unified-page" header={<PageHeader title="Απόβλητα" description="Καταγραφή και παρακολούθηση αποβλήτων ανά τμήμα, κατηγορία και περίοδο." actions={<Button icon={<Plus size={17}/>} onClick={openNew}>Νέα μέτρηση</Button>}/> }>
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel="Σύνολα αποβλήτων"><StatCard compact icon={Weight} label="Συνολικό βάρος" value={`${formatNumber(metrics.totalWeight,1)} kg`}/><StatCard compact icon={Boxes} label="Περιέκτες" value={formatNumber(metrics.totalContainers,0)}/><StatCard compact icon={Gauge} label="Δείκτης" value={`${formatNumber(metrics.indicator,1)} kg / 1.000`}/><StatCard compact icon={Recycle} label="Επικίνδυνα" value={`${formatNumber(metrics.hazardousPercent,1)}%`} tone={metrics.hazardousPercent?'warning':'default'}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση τμήματος, εταιρείας ή παραστατικού…"
      activeFilterCount={[search,departmentFilter,typeFilter,dateFrom,dateTo].filter(Boolean).length} onClearFilters={clearFilters}
      filters={<><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} aria-label="Από"/><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} aria-label="Έως"/><select value={departmentFilter} onChange={e=>setDepartmentFilter(e.target.value)} aria-label="Τμήμα"><option value="">Όλα τα τμήματα</option>{departments.map(item=><option key={item}>{item}</option>)}</select><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} aria-label="Κατηγορία"><option value="">Όλες οι κατηγορίες</option>{wasteTypes.map(item=><option key={item}>{item}</option>)}</select></>}
      selectedCount={selectedRecords.length} selectedLabel="μετρήσεις" onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>Εξαγωγή CSV</Button></>}
      columns={columns} rows={filtered} getRowKey={row=>row.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel="Μετρήσεις αποβλήτων" footer={<span>{filtered.length} εγγραφές</span>} emptyTitle="Δεν υπάρχουν μετρήσεις"
    />

    <Drawer open={drawerOpen} onClose={close} title={selectedId?'Επεξεργασία μέτρησης':'Νέα μέτρηση αποβλήτων'} description="Καταγράψτε κατηγορία, βάρος και στοιχεία αποκομιδής." width={1120} position="center" footer={<FormActions form="waste-record-form" onCancel={close} extraActions={selectedId?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή</Button>:null}/> }>
      <form id="waste-record-form" className="records-unified-form" onSubmit={save}>
        <FormSection title="Βασικά στοιχεία">
          <FormGrid columns={2}>
            <FormField label="Ημερομηνία" required><input type="date" value={greekToIso(formData.date)} onChange={e=>setField('date',isoToGreek(e.target.value))}/></FormField>
            <FormField label="Τμήμα" required><LibraryField hideLabel libraryKey="departments" value={formData.department} onChange={value=>setField('department',value)} placeholder="Επιλέξτε ή γράψτε τμήμα"/></FormField>
            <FormField label="Κατηγορία αποβλήτου" required><LibraryField hideLabel allowManual libraryKey="waste-types" value={formData.wasteType} onChange={value=>setField('wasteType',value)} placeholder="Επιλέξτε ή γράψτε κατηγορία"/></FormField>
            <FormField label="Υπεύθυνος καταχώρησης"><input value={formData.responsible} onChange={e=>setField('responsible',e.target.value)}/></FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="Μέτρηση">
          <FormGrid columns={3}>
            <FormField label="Βάρος (kg)" required><input type="number" min="0" step="0.01" value={formData.weightKg} onChange={e=>setField('weightKg',e.target.value)}/></FormField>
            <FormField label="Αριθμός περιεκτών"><input type="number" min="0" step="1" value={formData.containers} onChange={e=>setField('containers',e.target.value)}/></FormField>
            <FormField label="Ημέρες νοσηλείας"><input type="number" min="0" step="1" value={formData.patientDays} onChange={e=>setField('patientDays',e.target.value)}/></FormField>
          </FormGrid>
          <div className="records-unified-calculation"><div><span>Καταγεγραμμένο βάρος</span><strong>{formatNumber(number(formData.weightKg),1)} kg</strong></div><div><span>Δείκτης</span><strong>{formatNumber(recordIndicator(formData),1)} kg / 1.000 ημέρες</strong></div></div>
        </FormSection>
        <FormSection title="Αποκομιδή & τεκμηρίωση">
          <FormGrid columns={2}><FormField label="Εταιρεία αποκομιδής"><input value={formData.collectionCompany} onChange={e=>setField('collectionCompany',e.target.value)}/></FormField><FormField label="Αριθμός παραστατικού"><input value={formData.documentNumber} onChange={e=>setField('documentNumber',e.target.value)}/></FormField></FormGrid>
        </FormSection>
        <FormSection title="Σημειώσεις"><FormField><textarea rows="5" value={formData.notes} onChange={e=>setField('notes',e.target.value)}/></FormField></FormSection>
      </form>
    </Drawer>
  </PageChrome>
}
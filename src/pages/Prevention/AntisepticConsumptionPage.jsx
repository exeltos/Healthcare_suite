import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useServiceCollection } from '../../core/hooks'
import { BarChart3, Download, Droplets, Gauge, PackagePlus, Plus, Printer, Trash2 } from 'lucide-react'
import {
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
import {
  ANTISEPTIC_CONSUMPTION_EVENT,
  deleteAntisepticConsumption,
  loadAntisepticConsumption,
  upsertAntisepticConsumption,
} from '../../services/preventionService'
import '../Records/RecordsUnified.css'
import { masterNames } from '../../services/masterDataService'

const EMPTY_RECORD = { date:'', department:'', product:'', openingStock:'', received:'', closingStock:'', consumption:'', patientDays:'', responsible:'', notes:'' }

function number(value){ const parsed=Number(String(value??'').replace(',','.')); return Number.isFinite(parsed)?parsed:0 }
function calculatedConsumption(record){ if(record.consumption!==''&&record.consumption!=null&&!record.openingStock&&!record.received&&!record.closingStock) return number(record.consumption); return Math.max(0,number(record.openingStock)+number(record.received)-number(record.closingStock)) }
function indicatorForRecord(record){ const days=number(record.patientDays); return days>0?(calculatedConsumption(record)/1000/days)*1000:0 }
function formatNumber(value,digits=0){ return Number(value||0).toLocaleString('el-GR',{minimumFractionDigits:digits,maximumFractionDigits:digits}) }
function greekToIso(value){ if(!value)return''; if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value; const [day,month,year]=String(value).split('/'); return year?`${year}-${month}-${day}`:'' }
function isoToGreek(value){ if(!value)return''; const [year,month,day]=String(value).split('-'); return day?`${day}/${month}/${year}`:value }
function todayGreek(){ return isoToGreek(new Date().toISOString().slice(0,10)) }

const exportColumns=[
  {label:'Ημερομηνία',value:(row)=>row.date||''},{label:'Τμήμα',value:(row)=>row.department||''},{label:'Προϊόν',value:(row)=>row.product||''},
  {label:'Κατανάλωση (ml)',value:(row)=>calculatedConsumption(row)},{label:'Ημέρες νοσηλείας',value:(row)=>row.patientDays||''},{label:'Δείκτης L/1.000',value:(row)=>indicatorForRecord(row).toFixed(2)},{label:'Υπεύθυνος',value:(row)=>row.responsible||''},
]

export default function AntisepticConsumptionPage(){
  const [records, refreshRecords, setRecords] = useServiceCollection(loadAntisepticConsumption, ANTISEPTIC_CONSUMPTION_EVENT)
  const [search,setSearch]=useState('')
  const [department,setDepartment]=useState('')
  const [sort,setSort]=useState({key:'department',direction:'asc'})
  const [selectedKeys,setSelectedKeys]=useState([])
  const [drawerOpen,setDrawerOpen]=useState(false)
  const [selectedId,setSelectedId]=useState(null)
  const [formData,setFormData]=useState(EMPTY_RECORD)

  

  const departments=masterNames('departments')
  const filtered=useMemo(()=>{
    const query=normalizeText(search)
    return sortRows(records.filter(record=>(!department||record.department===department)&&(!query||normalizeText([record.date,record.department,record.product,record.responsible].filter(Boolean).join(' ')).includes(query))),sort)
  },[records,search,department,sort])
  const selectedRecords=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const metrics=useMemo(()=>{ const totalConsumption=filtered.reduce((sum,item)=>sum+calculatedConsumption(item),0); const totalPatientDays=filtered.reduce((sum,item)=>sum+number(item.patientDays),0); return{records:filtered.length,totalConsumption,totalPatientDays,indicator:totalPatientDays>0?(totalConsumption/1000/totalPatientDays)*1000:0}},[filtered])

  function openNew(){ setSelectedId(null); setFormData({...EMPTY_RECORD,date:todayGreek()}); setDrawerOpen(true) }
  function openRecord(record){ setSelectedId(record.id); setFormData({...EMPTY_RECORD,...record}); setDrawerOpen(true) }
  function close(){ setDrawerOpen(false); setSelectedId(null); setFormData(EMPTY_RECORD) }
  function setField(name,value){ setFormData(current=>{ const next={...current,[name]:value}; if(['openingStock','received','closingStock'].includes(name)) next.consumption=String(Math.max(0,number(next.openingStock)+number(next.received)-number(next.closingStock))); return next }) }
  function save(event){ event.preventDefault(); if(!formData.date||!formData.department||!formData.product){notifyAction('Συμπληρώστε ημερομηνία, τμήμα και προϊόν.');return} upsertAntisepticConsumption({...formData,id:selectedId||`ANT-${Date.now()}`,consumption:String(calculatedConsumption(formData)),indicator:indicatorForRecord(formData),updatedAt:new Date().toISOString()}); refreshRecords(); close() }
  function remove(){ if(!selectedId||!confirmAction('Να διαγραφεί η μέτρηση;'))return; deleteAntisepticConsumption(selectedId); refreshRecords(); close() }
  function exportSelected(){ downloadCsv({filename:`antiseptika-${new Date().toISOString().slice(0,10)}.csv`,columns:exportColumns,rows:selectedRecords}) }
  function printSelected(){ printRows({title:'Κατανάλωση Αντισηπτικών',columns:exportColumns,rows:selectedRecords}) }

  const columns=[
    {key:'date',label:'Ημερομηνία',width:'130px',render:(row)=>row.date||'—'},
    {key:'department',label:'Τμήμα',sortable:true,render:(row)=><EntityCell primary={row.department} secondary={row.responsible||'Χωρίς υπεύθυνο'}/>},
    {key:'product',label:'Προϊόν',sortable:true,render:(row)=>row.product||'—'},
    {key:'consumption',label:'Κατανάλωση',width:'145px',render:(row)=>`${formatNumber(calculatedConsumption(row),0)} ml`},
    {key:'patientDays',label:'Ημέρες νοσηλείας',width:'150px',render:(row)=>formatNumber(number(row.patientDays),0)},
    {key:'indicator',label:'Δείκτης',width:'135px',render:(row)=>`${formatNumber(indicatorForRecord(row),2)} L / 1.000`},
  ]

  return <PageChrome className="records-unified-page" header={<PageHeader title="Αντισηπτικά" description="Παρακολούθηση αποθεμάτων, κατανάλωσης και δείκτη ανά τμήμα." actions={<Button icon={<Plus size={17}/>} onClick={openNew}>Νέα μέτρηση</Button>}/> }>
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel="Σύνολα αντισηπτικών"><StatCard compact icon={BarChart3} label="Μετρήσεις" value={metrics.records}/><StatCard compact icon={Droplets} label="Συνολική κατανάλωση" value={`${formatNumber(metrics.totalConsumption/1000,2)} L`}/><StatCard compact icon={PackagePlus} label="Ημέρες νοσηλείας" value={formatNumber(metrics.totalPatientDays,0)}/><StatCard compact icon={Gauge} label="Δείκτης" value={`${formatNumber(metrics.indicator,2)} L / 1.000`}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση τμήματος, προϊόντος ή υπευθύνου…"
      activeFilterCount={[search,department].filter(Boolean).length} onClearFilters={()=>{setSearch('');setDepartment('')}}
      filters={<select value={department} onChange={e=>setDepartment(e.target.value)} aria-label="Τμήμα"><option value="">Όλα τα τμήματα</option>{departments.map(item=><option key={item}>{item}</option>)}</select>}
      selectedCount={selectedRecords.length} selectedLabel="μετρήσεις" onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>Εξαγωγή CSV</Button></>}
      columns={columns} rows={filtered} getRowKey={row=>row.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel="Κατανάλωση αντισηπτικών" footer={<span>{filtered.length} εγγραφές</span>} emptyTitle="Δεν υπάρχουν μετρήσεις"
    />

    <Drawer open={drawerOpen} onClose={close} title={selectedId?'Επεξεργασία μέτρησης':'Νέα μέτρηση αντισηπτικών'} description="Η κατανάλωση και ο δείκτης υπολογίζονται αυτόματα." width={1080} position="center" footer={<FormActions form="antiseptic-record-form" onCancel={close} extraActions={selectedId?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή</Button>:null}/> }>
      <form id="antiseptic-record-form" className="records-unified-form" onSubmit={save}>
        <FormSection title="Βασικά στοιχεία">
          <FormGrid columns={2}>
            <FormField label="Ημερομηνία" required><input type="date" value={greekToIso(formData.date)} onChange={e=>setField('date',isoToGreek(e.target.value))}/></FormField>
            <FormField label="Τμήμα" required><LibraryField hideLabel libraryKey="departments" value={formData.department} onChange={value=>setField('department',value)} placeholder="Επιλέξτε ή γράψτε τμήμα"/></FormField>
            <FormField label="Προϊόν αντισηπτικού" required><LibraryField hideLabel allowManual libraryKey="antiseptic-products" value={formData.product} onChange={value=>setField('product',value)} placeholder="Επιλέξτε ή γράψτε προϊόν"/></FormField>
            <FormField label="Υπεύθυνος καταχώρησης"><input value={formData.responsible} onChange={e=>setField('responsible',e.target.value)}/></FormField>
          </FormGrid>
        </FormSection>
        <FormSection title="Αποθέματα & κατανάλωση" description="Κατανάλωση = αρχικό απόθεμα + παραλαβές − τελικό απόθεμα.">
          <FormGrid columns={4}>
            <FormField label="Αρχικό απόθεμα (ml)"><input type="number" min="0" step="1" value={formData.openingStock} onChange={e=>setField('openingStock',e.target.value)}/></FormField>
            <FormField label="Παραλαβές (ml)"><input type="number" min="0" step="1" value={formData.received} onChange={e=>setField('received',e.target.value)}/></FormField>
            <FormField label="Τελικό απόθεμα (ml)"><input type="number" min="0" step="1" value={formData.closingStock} onChange={e=>setField('closingStock',e.target.value)}/></FormField>
            <FormField label="Ημέρες νοσηλείας"><input type="number" min="0" step="1" value={formData.patientDays} onChange={e=>setField('patientDays',e.target.value)}/></FormField>
          </FormGrid>
          <div className="records-unified-calculation"><div><span>Υπολογισμένη κατανάλωση</span><strong>{formatNumber(calculatedConsumption(formData),0)} ml</strong></div><div><span>Δείκτης</span><strong>{formatNumber(indicatorForRecord(formData),2)} L / 1.000 ημέρες</strong></div></div>
        </FormSection>
        <FormSection title="Σημειώσεις"><FormField><textarea rows="5" value={formData.notes} onChange={e=>setField('notes',e.target.value)}/></FormField></FormSection>
      </form>
    </Drawer>
  </PageChrome>
}
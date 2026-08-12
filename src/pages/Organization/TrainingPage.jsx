import { confirmAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { BookOpenCheck, Check, Download, GraduationCap, Plus, Printer, Trash2, UserCheck } from 'lucide-react'
import {
  Badge, Button, DateRangeFilter, Drawer, EntityCell, EntitySummary, FormActions, FormField, FormGrid, FormSection,
  LibraryField, ListWorkspace, PageChrome, PageHeader, StatCard,
} from '../../components/core'
import AttachmentManager from '../../components/core/AttachmentManager/AttachmentManager'
import HybridMultiSelector from '../../components/core/HybridMultiSelector/HybridMultiSelector'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { deleteTraining, loadTraining, ORGANIZATION_EVENT, upsertTraining } from '../../services/organizationService'
import { EMPLOYEES_EVENT, loadEmployees } from '../../services/employeesService'
import { useRecordDeepLink } from '../../core/navigation/recordDeepLink'
import './OrganizationUnified.css'
import { masterNames } from '../../services/masterDataService'

const EMPTY={title:'',category:'Κλινική εκπαίδευση',department:'',trainer:'',date:'',status:'Προγραμματισμένη',durationHours:'1',validUntil:'',attendance:[],attachments:[],notes:''}
const STATUSES=['Προγραμματισμένη','Σε εξέλιξη','Ολοκληρωμένη','Ακυρωμένη']
const CATEGORIES=['Κλινική εκπαίδευση','Ασφάλεια','Ποιότητα','Εισαγωγική','Υποχρεωτική']
const displayDate=value=>value?new Date(`${value}T12:00:00`).toLocaleDateString('el-GR'):'—'
const exportColumns=[{label:'Εκπαίδευση',value:r=>r.title||''},{label:'Κατηγορία',value:r=>r.category||''},{label:'Τμήμα',value:r=>r.department||''},{label:'Ημερομηνία',value:r=>r.date||''},{label:'Εκπαιδευτής',value:r=>r.trainer||''},{label:'Παρόντες',value:r=>(r.attendance||[]).filter(x=>['Παρών','Online'].includes(x.status)).length},{label:'Σύνολο',value:r=>(r.attendance||[]).length},{label:'Κατάσταση',value:r=>r.status||''}]

export default function TrainingPage(){
 const [rows,setRows]=useState(loadTraining); const [employees,setEmployees]=useState(loadEmployees); const [search,setSearch]=useState(''); const [status,setStatus]=useState(''); const [department,setDepartment]=useState(''); const [from,setFrom]=useState(''); const [to,setTo]=useState(''); const [sort,setSort]=useState({key:'date',direction:'desc'}); const [selectedKeys,setSelectedKeys]=useState([])
 const [open,setOpen]=useState(false); const [editing,setEditing]=useState(null); const [form,setForm]=useState(EMPTY)
 const notificationLink=useRecordDeepLink(rows)
 useAppEvents([ORGANIZATION_EVENT, EMPLOYEES_EVENT], () => { setRows(loadTraining()); setEmployees(loadEmployees()) })
 const departments=masterNames('departments')
 const filtered=useMemo(()=>{const q=normalizeText(search);return sortRows(rows.filter(r=>(!status||r.status===status)&&(!department||r.department===department)&&(!from||r.date>=from)&&(!to||r.date<=to)&&(!q||normalizeText([r.title,r.category,r.department,r.trainer].filter(Boolean).join(' ')).includes(q))),sort)},[rows,search,status,department,from,to,sort])
 const selected=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys]); const metrics=useMemo(()=>({total:filtered.length,scheduled:filtered.filter(r=>r.status==='Προγραμματισμένη').length,completed:filtered.filter(r=>r.status==='Ολοκληρωμένη').length,attended:filtered.reduce((n,r)=>n+(r.attendance||[]).filter(x=>['Παρών','Online'].includes(x.status)).length,0)}),[filtered])
 const attendeeKey=item=>String(item.employeeId||item.attendeeId||item.id||'')
 const selectorValue=useMemo(()=>(form.attendance||[]).map(item=>({id:item.employeeId||item.attendeeId,name:item.employeeName,meta:[item.department,item.professionalCategory].filter(Boolean).join(' · '),manual:!!item.manual,values:{name:item.employeeName||'',department:item.department||'',role:item.professionalCategory||''}})),[form.attendance])
 const setField=(name,value)=>setForm(c=>({...c,[name]:value}))
 function openNew(){setEditing(null);setForm({...EMPTY,date:new Date().toISOString().slice(0,10)});setOpen(true)}
 function openRecord(row){notificationLink.markOpened(row.id);setEditing(row);setForm({...EMPTY,...row,attendance:row.attendance||[],attachments:row.attachments||[]});setOpen(true)}
 function close(){notificationLink.completeReview();setOpen(false);setEditing(null);setForm(EMPTY)}
 function save(e){e.preventDefault();upsertTraining({...form,id:editing?.id||form.id,durationHours:String(form.durationHours||'')});setRows(loadTraining());close()}
 function remove(){if(!editing||!confirmAction('Να διαγραφεί η εκπαίδευση;'))return;deleteTraining(editing.id);setRows(loadTraining());close()}
 function setAttendees(selection){setForm(c=>{const current=new Map((c.attendance||[]).map(item=>[attendeeKey(item),item]));const attendance=selection.map(entry=>{const key=String(entry.id);const existing=current.get(key)||{};const source=entry.source||{};return {...existing,employeeId:entry.manual?'':entry.id,attendeeId:entry.manual?entry.id:'',employeeName:entry.name,department:entry.manual?(entry.values?.department||''):(source.department||existing.department||''),professionalCategory:entry.manual?(entry.values?.role||''):(source.professionalCategory||existing.professionalCategory||''),manual:!!entry.manual,status:existing.status||'Παρών',score:existing.score||'',certificate:existing.certificate||null}});return {...c,attendance}})}
 function updateAttendance(id,patch){setForm(c=>({...c,attendance:c.attendance.map(x=>attendeeKey(x)===String(id)?{...x,...patch}:x)}))}
 const columns=[{key:'title',label:'Εκπαίδευση',sortable:true,render:r=><EntityCell primary={r.title} secondary={r.category}/>},{key:'department',label:'Τμήμα',sortable:true,render:r=>r.department||'Όλα τα τμήματα'},{key:'date',label:'Ημερομηνία',width:'130px',sortable:true,render:r=>displayDate(r.date)},{key:'trainer',label:'Εκπαιδευτής',sortable:true},{key:'attendance',label:'Παρουσίες',width:'110px',render:r=>`${(r.attendance||[]).filter(x=>['Παρών','Online'].includes(x.status)).length}/${(r.attendance||[]).length}`},{key:'attachments',label:'Υλικό',width:'80px',render:r=>(r.attachments||[]).length},{key:'status',label:'Κατάσταση',width:'150px',render:r=><Badge tone={r.status==='Ολοκληρωμένη'?'success':r.status==='Ακυρωμένη'?'danger':r.status==='Σε εξέλιξη'?'warning':'neutral'}>{r.status}</Badge>}]
 return <PageChrome className="organization-unified-page" header={<PageHeader title="Εκπαίδευση" description="Προγραμματισμός, παρουσιολόγιο, αποτελέσματα και εκπαιδευτικό υλικό σε κοινή ροή." actions={<Button icon={<Plus size={17}/>} onClick={openNew}>Νέα εκπαίδευση</Button>}/> }>
  <ListWorkspace stats={<EntitySummary columns={4}><StatCard compact icon={GraduationCap} label="Εκπαιδεύσεις" value={metrics.total}/><StatCard compact icon={BookOpenCheck} label="Προγραμματισμένες" value={metrics.scheduled}/><StatCard compact icon={Check} label="Ολοκληρωμένες" value={metrics.completed}/><StatCard compact icon={UserCheck} label="Παρουσίες" value={metrics.attended}/></EntitySummary>}
   searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση εκπαίδευσης, τμήματος ή εκπαιδευτή…" activeFilterCount={[search,status,department,from,to].filter(Boolean).length} onClearFilters={()=>{setSearch('');setStatus('');setDepartment('');setFrom('');setTo('')}}
   filters={<><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Όλες οι καταστάσεις</option>{STATUSES.map(x=><option key={x}>{x}</option>)}</select><select value={department} onChange={e=>setDepartment(e.target.value)}><option value="">Όλα τα τμήματα</option>{departments.map(x=><option key={x}>{x}</option>)}</select><DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo}/></>}
   selectedCount={selected.length} selectedLabel="εκπαιδεύσεις" onClearSelection={()=>setSelectedKeys([])} bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:'Εκπαιδεύσεις',columns:exportColumns,rows:selected})}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:'ekpaideyseis.csv',columns:exportColumns,rows:selected})}>Εξαγωγή CSV</Button></>}
   columns={columns} rows={filtered} getRowKey={r=>r.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel="Εκπαιδεύσεις" footer={<span>{filtered.length} εγγραφές</span>} emptyTitle="Δεν υπάρχουν εκπαιδεύσεις" highlightedKey={notificationLink.highlightedId}/>

  <Drawer open={open} onClose={close} title={editing?'Επεξεργασία εκπαίδευσης':'Νέα εκπαίδευση'} description="Στοιχεία, παρουσιολόγιο και αρχεία στην ίδια scrollable καρτέλα." width={1180} position="center" footer={<FormActions form="training-form" onCancel={close} extraActions={editing?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή</Button>:null}/> }>
   <form id="training-form" className="organization-unified-form" onSubmit={save}>
    <FormSection title="Βασικά στοιχεία"><FormGrid columns={2}>
     <FormField label="Τίτλος" required><input required value={form.title} onChange={e=>setField('title',e.target.value)}/></FormField><FormField label="Κατηγορία"><select value={form.category} onChange={e=>setField('category',e.target.value)}>{CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></FormField>
     <FormField label="Τμήμα"><LibraryField hideLabel libraryKey="departments" value={form.department} onChange={value=>setField('department',value)} placeholder="Επιλέξτε ή γράψτε τμήμα"/></FormField><FormField label="Εκπαιδευτής"><input value={form.trainer} onChange={e=>setField('trainer',e.target.value)}/></FormField>
     <FormField label="Ημερομηνία" required><input type="date" required value={form.date} onChange={e=>setField('date',e.target.value)}/></FormField><FormField label="Διάρκεια (ώρες)"><input inputMode="decimal" value={form.durationHours} onChange={e=>setField('durationHours',e.target.value)} placeholder="π.χ. 1,5"/></FormField>
     <FormField label="Κατάσταση"><select value={form.status} onChange={e=>setField('status',e.target.value)}>{STATUSES.map(x=><option key={x}>{x}</option>)}</select></FormField><FormField label="Ισχύς πιστοποίησης έως"><input type="date" value={form.validUntil||''} onChange={e=>setField('validUntil',e.target.value)}/></FormField>
    </FormGrid></FormSection>
    <FormSection title={`Παρουσιολόγιο (${form.attendance.length})`} description="Προσθέστε συμμετέχοντες από το μητρώο προσωπικού ή χειροκίνητα και καταγράψτε παρουσία / αποτέλεσμα.">
     <HybridMultiSelector items={employees} selected={selectorValue} onChange={setAttendees} label="Συμμετέχοντες" getName={item=>item.fullName||''} getMeta={item=>[item.department,item.professionalCategory].filter(Boolean).join(' · ')} manualFields={[{key:'name',label:'Ονοματεπώνυμο',required:true},{key:'department',label:'Τμήμα'},{key:'role',label:'Ιδιότητα'}]}/>
     {form.attendance.length>0&&<div className="org-attendance-list org-attendance-list--selected">{form.attendance.map(att=><div className="org-attendance-row is-selected" key={attendeeKey(att)}><div className="org-stack-row__main"><strong>{att.employeeName}</strong><small>{[att.department,att.professionalCategory,att.manual?'Χειροκίνητη καταχώρηση':'Από μητρώο προσωπικού'].filter(Boolean).join(' · ')}</small></div><select value={att.status} onChange={e=>updateAttendance(attendeeKey(att),{status:e.target.value})}><option>Παρών</option><option>Απών</option><option>Δικαιολογημένος</option><option>Online</option><option>Δεν ολοκλήρωσε</option></select><input className="org-score" inputMode="decimal" value={att.score||''} onChange={e=>updateAttendance(attendeeKey(att),{score:e.target.value})} placeholder="Βαθμός"/></div>)}</div>}
    </FormSection>
    <FormSection title="Εκπαιδευτικό υλικό & συνημμένα"><AttachmentManager value={form.attachments} onChange={value=>setField('attachments',value)} hint="Παρουσιάσεις, παρουσιολόγια, πιστοποιητικά ή άλλο υλικό"/></FormSection>
    <FormSection title="Σημειώσεις"><FormField><textarea rows="5" value={form.notes||''} onChange={e=>setField('notes',e.target.value)}/></FormField></FormSection>
   </form>
  </Drawer>
 </PageChrome>
}
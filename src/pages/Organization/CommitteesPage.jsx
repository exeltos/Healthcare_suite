import { formatDate } from '../../core/utils/dateTime'
import { confirmAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { CalendarClock, Download, Plus, Printer, Trash2, UserRound, Users } from 'lucide-react'
import {
  Badge, Button, Drawer, EntityCell, EntitySummary, FormActions, FormField, FormGrid, FormSection,
  LibraryField, ListWorkspace, PageChrome, PageHeader, StatCard,
} from '../../components/core'
import AttachmentManager from '../../components/core/AttachmentManager/AttachmentManager'
import HybridMultiSelector from '../../components/core/HybridMultiSelector/HybridMultiSelector'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { addInterval, deleteCommittee, loadCommittees, ORGANIZATION_EVENT, upsertCommittee } from '../../services/organizationService'
import { EMPLOYEES_EVENT, loadEmployees } from '../../services/employeesService'
import './OrganizationUnified.css'

const EMPTY={name:'',type:'Επιτροπή',chair:'',secretary:'',lastMeeting:'',nextMeeting:'',status:'Ενεργή',frequency:'Μηνιαία',members:[],meetings:[],attachments:[],purpose:'',notes:''}
const EMPTY_MEETING={date:'',title:'',presentIds:[],minutes:'',decisions:'',attachments:[]}
const FREQUENCIES=['Μηνιαία','Διμηνιαία','Τριμηνιαία','Εξαμηνιαία','Ετήσια','Έκτακτη']
const displayDate = formatDate
const exportColumns=[{label:'Επιτροπή',value:r=>r.name||''},{label:'Τύπος',value:r=>r.type||''},{label:'Πρόεδρος',value:r=>r.chair||''},{label:'Μέλη',value:r=>(r.members||[]).length},{label:'Συνεδριάσεις',value:r=>(r.meetings||[]).length},{label:'Συχνότητα',value:r=>r.frequency||''},{label:'Επόμενη συνεδρίαση',value:r=>r.nextMeeting||''},{label:'Κατάσταση',value:r=>r.status||''}]

export default function CommitteesPage(){
 const [rows,setRows]=useState(loadCommittees); const [employees,setEmployees]=useState(loadEmployees); const [search,setSearch]=useState(''); const [type,setType]=useState(''); const [status,setStatus]=useState(''); const [sort,setSort]=useState({key:'name',direction:'asc'}); const [selectedKeys,setSelectedKeys]=useState([])
 const [open,setOpen]=useState(false); const [editing,setEditing]=useState(null); const [form,setForm]=useState(EMPTY); const [meeting,setMeeting]=useState(EMPTY_MEETING)
 useAppEvents([ORGANIZATION_EVENT, EMPLOYEES_EVENT], () => { setRows(loadCommittees()); setEmployees(loadEmployees()) })
 const types=useMemo(()=>uniqueSortedValues(rows,r=>r.type),[rows])
 const filtered=useMemo(()=>{const q=normalizeText(search);return sortRows(rows.filter(r=>(!type||r.type===type)&&(!status||r.status===status)&&(!q||normalizeText([r.name,r.type,r.chair,r.secretary,r.purpose].filter(Boolean).join(' ')).includes(q))),sort)},[rows,search,type,status,sort])
 const selected=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
 const metrics=useMemo(()=>({total:filtered.length,active:filtered.filter(r=>r.status==='Ενεργή').length,members:filtered.reduce((n,r)=>n+(r.members||[]).length,0),upcoming:filtered.filter(r=>r.nextMeeting&&r.nextMeeting>=new Date().toISOString().slice(0,10)).length}),[filtered])
 const setField=(name,value)=>setForm(c=>({...c,[name]:value}))
 function openNew(){setEditing(null);setForm(EMPTY);setMeeting(EMPTY_MEETING);setOpen(true)}
 function openRecord(row){setEditing(row);setForm({...EMPTY,...row,members:row.members||[],meetings:row.meetings||[],attachments:row.attachments||[]});setMeeting(EMPTY_MEETING);setOpen(true)}
 function close(){setOpen(false);setEditing(null);setForm(EMPTY)}
 function save(e){e.preventDefault();upsertCommittee({...form,id:editing?.id||form.id,nextMeeting:form.nextMeeting||addInterval(form.lastMeeting,form.frequency)});setRows(loadCommittees());close()}
 function remove(){if(!editing||!confirmAction('Να διαγραφεί η επιτροπή;'))return;deleteCommittee(editing.id);setRows(loadCommittees());close()}
 const memberSelectorValue=useMemo(()=>(form.members||[]).map(item=>({id:item.employeeId||item.id,name:item.fullName||'',meta:[item.department,item.capacity].filter(Boolean).join(' · '),manual:!!item.manual,values:{name:item.fullName||'',department:item.department||'',role:item.capacity||''},source:item.source||null})),[form.members])
 function setMembers(selection){setForm(c=>{const current=new Map((c.members||[]).map(item=>[String(item.employeeId||item.id),item]));const members=selection.map(entry=>{const key=String(entry.id);const existing=current.get(key)||{};const source=entry.source||{};return {...existing,id:entry.manual?(existing.id||entry.id):`employee-${entry.id}`,employeeId:entry.manual?'':entry.id,fullName:entry.name,department:entry.manual?(entry.values?.department||''):(source.department||existing.department||''),capacity:entry.manual?(entry.values?.role||''):(source.professionalCategory||existing.capacity||''),role:existing.role||'Μέλος',duties:existing.duties||'',manual:!!entry.manual}});return {...c,members}})}
 function updateMember(id,patch){setForm(c=>({...c,members:c.members.map(x=>x.id===id?{...x,...patch}:x)}))}
 function addMeeting(){if(!meeting.date)return;const item={...meeting,id:`meeting-${Date.now()}`,title:meeting.title||`Συνεδρίαση ${displayDate(meeting.date)}`};setForm(c=>({...c,meetings:[item,...c.meetings],lastMeeting:meeting.date,nextMeeting:c.frequency==='Έκτακτη'?c.nextMeeting:addInterval(meeting.date,c.frequency)}));setMeeting(EMPTY_MEETING)}
 function togglePresence(id){setMeeting(c=>({...c,presentIds:c.presentIds.includes(id)?c.presentIds.filter(x=>x!==id):[...c.presentIds,id]}))}
 const columns=[
  {key:'name',label:'Επιτροπή / Ομάδα',sortable:true,render:r=><EntityCell primary={r.name} secondary={r.type}/>},
  {key:'chair',label:'Πρόεδρος',sortable:true},{key:'members',label:'Μέλη',width:'90px',render:r=>(r.members||[]).length},{key:'meetings',label:'Συνεδριάσεις',width:'120px',render:r=>(r.meetings||[]).length},
  {key:'frequency',label:'Συχνότητα',width:'130px',sortable:true},{key:'nextMeeting',label:'Επόμενη',width:'130px',sortable:true,render:r=>displayDate(r.nextMeeting)},{key:'status',label:'Κατάσταση',width:'120px',render:r=><Badge tone={r.status==='Ενεργή'?'success':'neutral'}>{r.status}</Badge>},
 ]
 return <PageChrome className="organization-unified-page" header={<PageHeader title="Επιτροπές" description="Μέλη, συνεδριάσεις, πρακτικά, αποφάσεις και προγραμματισμός σε ενιαία καρτέλα." actions={<Button icon={<Plus size={17}/>} onClick={openNew}>Νέα επιτροπή</Button>}/> }>
  <ListWorkspace stats={<EntitySummary columns={4}><StatCard compact icon={Users} label="Επιτροπές" value={metrics.total}/><StatCard compact icon={UserRound} label="Ενεργές" value={metrics.active}/><StatCard compact icon={Users} label="Μέλη" value={metrics.members}/><StatCard compact icon={CalendarClock} label="Προγραμματισμένες" value={metrics.upcoming}/></EntitySummary>}
   searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση επιτροπής ή υπευθύνου…" activeFilterCount={[search,type,status].filter(Boolean).length} onClearFilters={()=>{setSearch('');setType('');setStatus('')}}
   filters={<><select value={type} onChange={e=>setType(e.target.value)}><option value="">Όλοι οι τύποι</option>{types.map(x=><option key={x}>{x}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Όλες οι καταστάσεις</option><option>Ενεργή</option><option>Ανενεργή</option></select></>}
   selectedCount={selected.length} selectedLabel="επιτροπές" onClearSelection={()=>setSelectedKeys([])} bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:'Επιτροπές',columns:exportColumns,rows:selected})}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:'epitropes.csv',columns:exportColumns,rows:selected})}>Εξαγωγή CSV</Button></>}
   columns={columns} rows={filtered} getRowKey={r=>r.id} onRowClick={openRecord} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel="Επιτροπές" footer={<span>{filtered.length} εγγραφές</span>} emptyTitle="Δεν υπάρχουν επιτροπές"/>

  <Drawer open={open} onClose={close} title={editing?'Επεξεργασία επιτροπής':'Νέα επιτροπή'} description="Τα στοιχεία, τα μέλη, οι συνεδριάσεις και τα αρχεία παραμένουν στην ίδια καρτέλα χωρίς tabs." width={1180} position="center" footer={<FormActions form="committee-form" onCancel={close} extraActions={editing?<Button variant="danger" icon={<Trash2 size={16}/>} onClick={remove}>Διαγραφή</Button>:null}/> }>
   <form id="committee-form" className="organization-unified-form" onSubmit={save}>
    <FormSection title="Βασικά στοιχεία"><FormGrid columns={2}>
     <FormField label="Ονομασία" required><input required value={form.name} onChange={e=>setField('name',e.target.value)}/></FormField>
     <FormField label="Τύπος"><select value={form.type} onChange={e=>setField('type',e.target.value)}><option>Επιτροπή</option><option>Ομάδα εργασίας</option><option>Συμβούλιο</option></select></FormField>
     <FormField label="Πρόεδρος / Υπεύθυνος"><input value={form.chair} onChange={e=>setField('chair',e.target.value)}/></FormField><FormField label="Γραμματέας"><input value={form.secretary} onChange={e=>setField('secretary',e.target.value)}/></FormField>
     <FormField label="Κατάσταση"><select value={form.status} onChange={e=>setField('status',e.target.value)}><option>Ενεργή</option><option>Ανενεργή</option></select></FormField><FormField label="Συχνότητα"><select value={form.frequency} onChange={e=>setField('frequency',e.target.value)}>{FREQUENCIES.map(x=><option key={x}>{x}</option>)}</select></FormField>
     <FormField label="Τελευταία συνεδρίαση"><input type="date" value={form.lastMeeting||''} onChange={e=>{setField('lastMeeting',e.target.value);if(form.frequency!=='Έκτακτη')setField('nextMeeting',addInterval(e.target.value,form.frequency))}}/></FormField><FormField label="Επόμενη συνεδρίαση"><input type="date" value={form.nextMeeting||''} onChange={e=>setField('nextMeeting',e.target.value)}/></FormField>
    </FormGrid><FormField label="Σκοπός / Αρμοδιότητες"><textarea rows="4" value={form.purpose||''} onChange={e=>setField('purpose',e.target.value)}/></FormField></FormSection>

    <FormSection title={`Μέλη (${form.members.length})`} description="Προσθέστε μέλη από το μητρώο προσωπικού ή χειροκίνητα και ορίστε ρόλο και αρμοδιότητες.">
     <HybridMultiSelector items={employees} selected={memberSelectorValue} onChange={setMembers} label="Μέλη επιτροπής" getName={item=>item.fullName||''} getMeta={item=>[item.department,item.professionalCategory].filter(Boolean).join(' · ')} manualFields={[{key:'name',label:'Ονοματεπώνυμο',required:true},{key:'department',label:'Τμήμα'},{key:'role',label:'Ιδιότητα'}]}/>
     <div className="org-stack-list">{form.members.length?form.members.map(m=><div className="org-stack-row" key={m.id}><div className="org-stack-row__main"><strong>{m.fullName}</strong><small>{[m.department,m.capacity,m.manual?'Χειροκίνητη καταχώρηση':'Από μητρώο προσωπικού'].filter(Boolean).join(' · ')}</small></div><select aria-label="Ρόλος στην επιτροπή" value={m.role||'Μέλος'} onChange={e=>updateMember(m.id,{role:e.target.value})}><option>Μέλος</option><option>Πρόεδρος</option><option>Γραμματέας</option><option>Συντονιστής</option></select><input aria-label="Αρμοδιότητες" placeholder="Αρμοδιότητες" value={m.duties||''} onChange={e=>updateMember(m.id,{duties:e.target.value})}/></div>):<div className="org-empty">Δεν έχουν προστεθεί μέλη.</div>}</div>
    </FormSection>

    <FormSection title={`Συνεδριάσεις (${form.meetings.length})`} description="Παρουσίες, αποφάσεις, πρακτικά και συνημμένα ανά συνεδρίαση.">
     <FormGrid columns={2}><FormField label="Ημερομηνία"><input type="date" value={meeting.date} onChange={e=>setMeeting({...meeting,date:e.target.value})}/></FormField><FormField label="Θέμα"><input value={meeting.title} onChange={e=>setMeeting({...meeting,title:e.target.value})} placeholder="Θέμα συνεδρίασης"/></FormField></FormGrid>
     {form.members.length>0&&<div className="org-presence"><span>Παρόντες</span>{form.members.map(m=><label key={m.id}><input type="checkbox" checked={meeting.presentIds.includes(m.id)} onChange={()=>togglePresence(m.id)}/>{m.fullName}</label>)}</div>}
     <FormGrid columns={2}><FormField label="Αποφάσεις"><textarea rows="3" value={meeting.decisions} onChange={e=>setMeeting({...meeting,decisions:e.target.value})}/></FormField><FormField label="Πρακτικά"><textarea rows="3" value={meeting.minutes} onChange={e=>setMeeting({...meeting,minutes:e.target.value})}/></FormField></FormGrid>
     <FormField label="Αρχεία συνεδρίασης"><AttachmentManager value={meeting.attachments} onChange={value=>setMeeting({...meeting,attachments:value})}/></FormField>
     <div className="org-section-action"><Button type="button" variant="secondary" icon={<Plus size={15}/>} onClick={addMeeting}>Προσθήκη συνεδρίασης</Button></div>
     <div className="org-stack-list">{form.meetings.length?form.meetings.map(mt=><div className="org-stack-row org-stack-row--meeting" key={mt.id}><div className="org-stack-row__main"><strong>{mt.title}</strong><small>{displayDate(mt.date)} · {(mt.presentIds||[]).length} παρόντες · {(mt.attachments||[]).length} αρχεία</small>{mt.decisions&&<p>{mt.decisions}</p>}</div><Button type="button" variant="ghost" size="sm" icon={<Trash2 size={14}/>} onClick={()=>setForm(c=>({...c,meetings:c.meetings.filter(x=>x.id!==mt.id)}))}>Αφαίρεση</Button></div>):<div className="org-empty">Δεν υπάρχουν συνεδριάσεις.</div>}</div>
    </FormSection>
    <FormSection title="Συνημμένα επιτροπής"><AttachmentManager value={form.attachments} onChange={value=>setField('attachments',value)}/></FormSection>
    <FormSection title="Σημειώσεις"><FormField><textarea rows="5" value={form.notes||''} onChange={e=>setField('notes',e.target.value)}/></FormField></FormSection>
   </form>
  </Drawer>
 </PageChrome>
}

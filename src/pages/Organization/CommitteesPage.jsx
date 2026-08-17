import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { AlertTriangle, Archive, CalendarClock, Download, Plus, Printer, Trash2, UserRound, Users } from 'lucide-react'
import {
  Badge, Button, Drawer, EntityCell, EntitySummary, FormActions, FormField, FormGrid, FormSection,
  ListWorkspace, PageChrome, PageHeader, StatCard,
} from '../../components/core'
import AttachmentManager from '../../components/core/AttachmentManager/AttachmentManager'
import HybridMultiSelector from '../../components/core/HybridMultiSelector/HybridMultiSelector'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { addInterval, loadCommittees, ORGANIZATION_EVENT } from '../../services/organizationService'
import { deleteOperationalCommittee, loadOperationalCommittees, saveOperationalCommittee } from '../../services/backend/organizationBackendService'
import { EMPLOYEES_EVENT, loadEmployees } from '../../services/employeesService'
import { useI18n } from '../../i18n'
import { committeeDisplayValue } from './committeePresentation'
import './OrganizationUnified.css'

const EMPTY={name:'',type:'Επιτροπή',chair:'',secretary:'',lastMeeting:'',nextMeeting:'',status:'Ενεργή',frequency:'Μηνιαία',members:[],meetings:[],attachments:[],purpose:'',notes:''}
const EMPTY_MEETING={date:'',title:'',presentIds:[],minutes:'',decisions:'',actions:[],attachments:[],status:'Πρόχειρη',finalizedAt:'',finalizedBy:'',quorumOverrideReason:''}
const FREQUENCIES=['Μηνιαία','Διμηνιαία','Τριμηνιαία','Εξαμηνιαία','Ετήσια','Έκτακτη']
const TYPES=['Επιτροπή','Ομάδα εργασίας','Συμβούλιο']
const MEMBER_ROLES=['Μέλος','Πρόεδρος','Γραμματέας','Συντονιστής']
const ACTION_STATUSES=['Ανοικτή','Σε εξέλιξη','Ολοκληρωμένη']

function displayDate(value,language='el'){
  if(!value)return'—'
  const date=new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString(language==='en'?'en-GB':'el-GR')
}

export default function CommitteesPage(){
  const { language }=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const [rows,setRows]=useState(loadCommittees)
  useEffect(()=>{loadOperationalCommittees().then(setRows).catch(()=>{})},[])
  const [employees,setEmployees]=useState(loadEmployees)
  const [search,setSearch]=useState('')
  const [type,setType]=useState('')
  const [status,setStatus]=useState('')
  const [sort,setSort]=useState({key:'name',direction:'asc'})
  const [selectedKeys,setSelectedKeys]=useState([])
  const [open,setOpen]=useState(false)
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState(EMPTY)
  const [meeting,setMeeting]=useState(EMPTY_MEETING)

  useAppEvents([ORGANIZATION_EVENT, EMPLOYEES_EVENT], () => {
    loadOperationalCommittees().then(setRows).catch(()=>{})
    setEmployees(loadEmployees())
  })

  const types=useMemo(()=>uniqueSortedValues(rows,r=>r.type),[rows])
  const filtered=useMemo(()=>{
    const q=normalizeText(search)
    return sortRows(rows.filter(r=>
      (!type||r.type===type) &&
      (!status||r.status===status) &&
      (!q||normalizeText([r.name,r.type,r.chair,r.secretary,r.purpose].filter(Boolean).join(' ')).includes(q))
    ),sort)
  },[rows,search,type,status,sort])

  const selected=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const metrics=useMemo(()=>{
    const today=new Date().toISOString().slice(0,10)
    const actions=filtered.flatMap(r=>(r.meetings||[]).flatMap(mt=>mt.actions||[]))
    return {
      total:filtered.length,
      active:filtered.filter(r=>r.status==='Ενεργή').length,
      upcoming:filtered.filter(r=>r.nextMeeting&&r.nextMeeting>=today).length,
      overdue:actions.filter(a=>a.status!=='Ολοκληρωμένη'&&a.dueDate&&a.dueDate<today).length,
    }
  },[filtered])

  const exportColumns=[
    {label:L('Επιτροπή','Committee'),value:r=>r.name||''},
    {label:L('Τύπος','Type'),value:r=>committeeDisplayValue(r.type,language)||''},
    {label:L('Πρόεδρος','Chair'),value:r=>r.chair||''},
    {label:L('Μέλη','Members'),value:r=>(r.members||[]).length},
    {label:L('Συνεδριάσεις','Meetings'),value:r=>(r.meetings||[]).length},
    {label:L('Συχνότητα','Frequency'),value:r=>committeeDisplayValue(r.frequency,language)||''},
    {label:L('Επόμενη συνεδρίαση','Next meeting'),value:r=>r.nextMeeting||''},
    {label:L('Κατάσταση','Status'),value:r=>committeeDisplayValue(r.status,language)||''},
  ]

  const columns=[
    {key:'name',label:L('Επιτροπή / Ομάδα','Committee / Group'),sortable:true,render:r=><EntityCell primary={r.name} secondary={committeeDisplayValue(r.type,language)}/>},
    {key:'chair',label:L('Πρόεδρος','Chair'),sortable:true},
    {key:'members',label:L('Μέλη','Members'),width:'90px',render:r=>(r.members||[]).length},
    {key:'meetings',label:L('Συνεδριάσεις','Meetings'),width:'120px',render:r=>(r.meetings||[]).length},
    {key:'frequency',label:L('Συχνότητα','Frequency'),width:'140px',sortable:true,render:r=>committeeDisplayValue(r.frequency,language)},
    {key:'nextMeeting',label:L('Επόμενη','Next'),width:'130px',sortable:true,render:r=>displayDate(r.nextMeeting,language)},
    {key:'status',label:L('Κατάσταση','Status'),width:'120px',render:r=><Badge tone={r.status==='Ενεργή'?'success':'neutral'}>{committeeDisplayValue(r.status,language)}</Badge>},
  ]

  const setField=(name,value)=>setForm(c=>({...c,[name]:value}))

  function openNew(){
    setEditing(null)
    setForm({...EMPTY,members:[],meetings:[],attachments:[]})
    setMeeting({...EMPTY_MEETING,actions:[],attachments:[]})
    setOpen(true)
  }

  function openRecord(row){
    setEditing(row)
    setForm({
      ...EMPTY,
      ...row,
      members:row.members||[],
      meetings:(row.meetings||[]).map(item=>({...item,actions:item.actions||[],attachments:item.attachments||[]})),
      attachments:row.attachments||[],
    })
    setMeeting({...EMPTY_MEETING,actions:[],attachments:[]})
    setOpen(true)
  }

  function close(){
    setOpen(false)
    setEditing(null)
    setForm(EMPTY)
    setMeeting(EMPTY_MEETING)
  }

  async function save(e){
    e.preventDefault()
    if(!String(form.name||'').trim()){
      notifyAction(L('Συμπληρώστε ονομασία επιτροπής.','Enter committee name.'))
      return
    }
    const duplicate=rows.find(r=>String(r.id)!==String(editing?.id||'')&&normalizeText(r.name)===normalizeText(form.name))
    if(duplicate){
      notifyAction(L('Υπάρχει ήδη επιτροπή με την ίδια ονομασία.','A committee with the same name already exists.'))
      return
    }
    const saved={
      ...form,
      id:editing?.id||form.id,
      nextMeeting:form.nextMeeting||addInterval(form.lastMeeting,form.frequency),
    }
    try {
      await saveOperationalCommittee(saved)
      setRows(await loadOperationalCommittees())
      close()
    } catch (error) {
      console.error('Committee save failed', error)
      notifyAction(L('Η αποθήκευση της επιτροπής απέτυχε.','Committee could not be saved.'))
    }
  }

  async function archiveCommittee(){
    if(!editing||!confirmAction(L('Να τεθεί η επιτροπή ως ανενεργή; Το ιστορικό συνεδριάσεων και αποφάσεων θα διατηρηθεί.','Set this committee as inactive? Meeting and decision history will be retained.')))return
    try {
      await saveOperationalCommittee({...form,status:'Ανενεργή'})
      setRows(await loadOperationalCommittees())
      close()
    } catch (error) {
      console.error('Committee archive failed', error)
      notifyAction(L('Η αρχειοθέτηση της επιτροπής απέτυχε.','Committee could not be archived.'))
    }
  }

  const memberSelectorValue=useMemo(()=>(form.members||[]).map(item=>({
    id:item.employeeId||item.id,
    name:item.fullName||'',
    meta:[item.department,item.capacity].filter(Boolean).join(' · '),
    manual:!!item.manual,
    values:{name:item.fullName||'',department:item.department||'',role:item.capacity||''},
    source:item.source||null,
  })),[form.members])

  function setMembers(selection){
    setForm(c=>{
      const current=new Map((c.members||[]).map(item=>[String(item.employeeId||item.id),item]))
      const members=selection.map(entry=>{
        const key=String(entry.id)
        const existing=current.get(key)||{}
        const source=entry.source||{}
        return {
          ...existing,
          id:entry.manual?(existing.id||entry.id):`employee-${entry.id}`,
          employeeId:entry.manual?'':entry.id,
          fullName:entry.name,
          department:entry.manual?(entry.values?.department||''):(source.department||existing.department||''),
          capacity:entry.manual?(entry.values?.role||''):(source.professionalCategory||existing.capacity||''),
          role:existing.role||'Μέλος',
          duties:existing.duties||'',
          manual:!!entry.manual,
        }
      })
      const memberIds=new Set(members.map(m=>m.id))
      const meetings=(c.meetings||[]).map(mt=>({...mt,presentIds:(mt.presentIds||[]).filter(id=>memberIds.has(id))}))
      return {...c,members,meetings}
    })
  }

  function updateMember(id,patch){
    setForm(c=>{
      let members=c.members.map(x=>x.id===id?{...x,...patch}:x)
      if(patch.role==='Πρόεδρος') members=members.map(x=>x.id!==id&&x.role==='Πρόεδρος'?{...x,role:'Μέλος'}:x)
      if(patch.role==='Γραμματέας') members=members.map(x=>x.id!==id&&x.role==='Γραμματέας'?{...x,role:'Μέλος'}:x)
      const chair=members.find(x=>x.role==='Πρόεδρος')?.fullName||''
      const secretary=members.find(x=>x.role==='Γραμματέας')?.fullName||''
      return {...c,members,chair,secretary}
    })
  }

  function togglePresence(id){
    setMeeting(c=>({...c,presentIds:c.presentIds.includes(id)?c.presentIds.filter(x=>x!==id):[...c.presentIds,id]}))
  }

  function addAction(){
    setMeeting(c=>({...c,actions:[...(c.actions||[]),{id:`action-${Date.now()}`,title:'',owner:'',dueDate:'',status:'Ανοικτή'}]}))
  }

  function updateAction(id,patch){
    setMeeting(c=>({...c,actions:(c.actions||[]).map(a=>a.id===id?{...a,...patch}:a)}))
  }

  function removeAction(id){
    setMeeting(c=>({...c,actions:(c.actions||[]).filter(a=>a.id!==id)}))
  }

  function addMeeting(){
    if(!meeting.date){
      notifyAction(L('Συμπληρώστε ημερομηνία συνεδρίασης.','Enter meeting date.'))
      return
    }
    const required=Math.max(1,Math.ceil((form.members||[]).length/2))
    if((form.members||[]).length && (meeting.presentIds||[]).length<required && !String(meeting.quorumOverrideReason||'').trim()){
      notifyAction(L('Δεν υπάρχει απαρτία. Αν η συνεδρίαση πρέπει να καταχωρηθεί κατ’ εξαίρεση, συμπληρώστε σύντομη αιτιολόγηση.','Quorum is not met. If the meeting must be recorded exceptionally, add a brief reason.'))
      return
    }
    if(!String(meeting.minutes||'').trim()){
      notifyAction(L('Συμπληρώστε σύντομα πρακτικά της συνεδρίασης.','Add brief meeting minutes.'))
      return
    }
    const item={
      ...meeting,
      id:`meeting-${Date.now()}`,
      title:meeting.title||`${L('Συνεδρίαση','Meeting')} ${displayDate(meeting.date,language)}`,
      actions:(meeting.actions||[]).filter(a=>String(a.title||'').trim()),
      status:'Οριστικοποιημένη',
      finalizedAt:new Date().toISOString(),
      finalizedBy:L('Τρέχων χρήστης','Current user'),
    }
    setForm(c=>({
      ...c,
      meetings:[item,...c.meetings],
      lastMeeting:meeting.date,
      nextMeeting:c.frequency==='Έκτακτη'?c.nextMeeting:addInterval(meeting.date,c.frequency),
    }))
    setMeeting({...EMPTY_MEETING,actions:[],attachments:[]})
  }

  return <PageChrome className="organization-unified-page" header={<PageHeader
    title={L('Επιτροπές','Committees')}
    description={L('Μέλη, συνεδριάσεις, πρακτικά, αποφάσεις και ενέργειες σε ενιαία καρτέλα.','Members, meetings, minutes, decisions and actions in one record.')}
    actions={<Button icon={<Plus size={17}/>} onClick={openNew}>{L('Νέα επιτροπή','New committee')}</Button>}
  />}>
    <ListWorkspace
      stats={<EntitySummary columns={4}>
        <StatCard compact icon={Users} label={L('Επιτροπές','Committees')} value={metrics.total}/>
        <StatCard compact icon={UserRound} label={L('Ενεργές','Active')} value={metrics.active}/>
        <StatCard compact icon={CalendarClock} label={L('Προγραμματισμένες','Scheduled')} value={metrics.upcoming}/>
        <StatCard compact icon={AlertTriangle} label={L('Εκπρόθεσμες ενέργειες','Overdue actions')} value={metrics.overdue}/>
      </EntitySummary>}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={L('Αναζήτηση επιτροπής ή υπευθύνου…','Search committee or responsible person…')}
      activeFilterCount={[search,type,status].filter(Boolean).length}
      onClearFilters={()=>{setSearch('');setType('');setStatus('')}}
      filters={<>
        <select value={type} onChange={e=>setType(e.target.value)} aria-label={L('Τύπος','Type')}>
          <option value="">{L('Όλοι οι τύποι','All types')}</option>
          {types.map(x=><option key={x} value={x}>{committeeDisplayValue(x,language)}</option>)}
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} aria-label={L('Κατάσταση','Status')}>
          <option value="">{L('Όλες οι καταστάσεις','All statuses')}</option>
          <option value="Ενεργή">{committeeDisplayValue('Ενεργή',language)}</option>
          <option value="Ανενεργή">{committeeDisplayValue('Ανενεργή',language)}</option>
        </select>
      </>}
      selectedCount={selected.length}
      selectedLabel={L('επιτροπές','committees')}
      onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<>
        <Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:L('Επιτροπές','Committees'),columns:exportColumns,rows:selected})}>{L('Εκτύπωση / PDF','Print / PDF')}</Button>
        <Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:'committees.csv',columns:exportColumns,rows:selected})}>{L('Εξαγωγή CSV','Export CSV')}</Button>
      </>}
      columns={columns}
      rows={filtered}
      getRowKey={r=>r.id}
      onRowClick={openRecord}
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
      sort={sort}
      onSortChange={setSort}
      ariaLabel={L('Επιτροπές','Committees')}
      footer={<span>{filtered.length} {L('εγγραφές','records')}</span>}
      emptyTitle={L('Δεν υπάρχουν επιτροπές','No committees')}
    />

    <Drawer
      open={open}
      onClose={close}
      title={editing?L('Επεξεργασία επιτροπής','Edit committee'):L('Νέα επιτροπή','New committee')}
      description={L('Στοιχεία, μέλη, συνεδριάσεις και αρχεία στην ίδια scrollable καρτέλα.','Details, members, meetings and files in the same scrollable record.')}
      width={1180}
      position="center"
      footer={<FormActions form="committee-form" onCancel={close} extraActions={editing&&form.status!=='Ανενεργή'?<Button variant="secondary" icon={<Archive size={16}/>} onClick={archiveCommittee}>{L('Αρχειοθέτηση','Archive')}</Button>:null}/>}
    >
      <form id="committee-form" className="organization-unified-form" onSubmit={save}>
        <FormSection title={L('Βασικά στοιχεία','Basic details')}>
          <FormGrid columns={2}>
            <FormField label={L('Ονομασία','Name')} required><input required value={form.name} onChange={e=>setField('name',e.target.value)}/></FormField>
            <FormField label={L('Τύπος','Type')}><select value={form.type} onChange={e=>setField('type',e.target.value)}>{TYPES.map(x=><option key={x} value={x}>{committeeDisplayValue(x,language)}</option>)}</select></FormField>
            <FormField label={L('Πρόεδρος / Υπεύθυνος','Chair / Responsible')}><input value={form.chair||''} readOnly placeholder={L('Ορίζεται από τα μέλη','Set from members')}/></FormField>
            <FormField label={L('Γραμματέας','Secretary')}><input value={form.secretary||''} readOnly placeholder={L('Ορίζεται από τα μέλη','Set from members')}/></FormField>
            <FormField label={L('Κατάσταση','Status')}><select value={form.status} onChange={e=>setField('status',e.target.value)}><option value="Ενεργή">{committeeDisplayValue('Ενεργή',language)}</option><option value="Ανενεργή">{committeeDisplayValue('Ανενεργή',language)}</option></select></FormField>
            <FormField label={L('Συχνότητα','Frequency')}><select value={form.frequency} onChange={e=>setField('frequency',e.target.value)}>{FREQUENCIES.map(x=><option key={x} value={x}>{committeeDisplayValue(x,language)}</option>)}</select></FormField>
            <FormField label={L('Τελευταία συνεδρίαση','Last meeting')}><input type="date" value={form.lastMeeting||''} onChange={e=>{setField('lastMeeting',e.target.value);if(form.frequency!=='Έκτακτη')setField('nextMeeting',addInterval(e.target.value,form.frequency))}}/></FormField>
            <FormField label={L('Επόμενη συνεδρίαση','Next meeting')}><input type="date" value={form.nextMeeting||''} onChange={e=>setField('nextMeeting',e.target.value)}/></FormField>
          </FormGrid>
          <FormField label={L('Σκοπός / Αρμοδιότητες','Purpose / Responsibilities')}><textarea rows="4" value={form.purpose||''} onChange={e=>setField('purpose',e.target.value)}/></FormField>
        </FormSection>

        <FormSection
          title={`${L('Μέλη','Members')} (${form.members.length})`}
          description={L('Προσθέστε μέλη από το μητρώο προσωπικού ή χειροκίνητα και ορίστε ρόλο και αρμοδιότητες. Ο Πρόεδρος και ο Γραμματέας ενημερώνονται αυτόματα από τους ρόλους των μελών.','Add members from the staff registry or manually and assign roles and responsibilities. Chair and Secretary are updated automatically from member roles.')}
        >
          <HybridMultiSelector
            items={employees}
            selected={memberSelectorValue}
            onChange={setMembers}
            label={L('Μέλη επιτροπής','Committee members')}
            getName={item=>item.fullName||''}
            getMeta={item=>[item.department,item.professionalCategory].filter(Boolean).join(' · ')}
            manualFields={[
              {key:'name',label:L('Ονοματεπώνυμο','Full name'),required:true},
              {key:'department',label:L('Τμήμα','Department')},
              {key:'role',label:L('Ιδιότητα','Professional category')},
            ]}
          />
          <div className="org-stack-list">
            {form.members.length?form.members.map(m=><div className="org-stack-row" key={m.id}>
              <div className="org-stack-row__main">
                <strong>{m.fullName}</strong>
                <small>{[m.department,m.capacity,committeeDisplayValue(m.manual?'Χειροκίνητη καταχώρηση':'Από μητρώο προσωπικού',language)].filter(Boolean).join(' · ')}</small>
              </div>
              <select aria-label={L('Ρόλος στην επιτροπή','Committee role')} value={m.role||'Μέλος'} onChange={e=>updateMember(m.id,{role:e.target.value})}>
                {MEMBER_ROLES.map(x=><option key={x} value={x}>{committeeDisplayValue(x,language)}</option>)}
              </select>
              <input aria-label={L('Αρμοδιότητες','Responsibilities')} placeholder={L('Αρμοδιότητες','Responsibilities')} value={m.duties||''} onChange={e=>updateMember(m.id,{duties:e.target.value})}/>
            </div>):<div className="org-empty">{L('Δεν έχουν προστεθεί μέλη.','No members have been added.')}</div>}
          </div>
        </FormSection>

        <FormSection
          title={`${L('Συνεδριάσεις','Meetings')} (${form.meetings.length})`}
          description={L('Παρουσίες, αποφάσεις, πρακτικά, ενέργειες και συνημμένα ανά συνεδρίαση.','Attendance, decisions, minutes, actions and attachments per meeting.')}
        >
          <FormGrid columns={2}>
            <FormField label={L('Ημερομηνία','Date')}><input type="date" value={meeting.date} onChange={e=>setMeeting({...meeting,date:e.target.value})}/></FormField>
            <FormField label={L('Θέμα','Subject')}><input value={meeting.title} onChange={e=>setMeeting({...meeting,title:e.target.value})} placeholder={L('Θέμα συνεδρίασης','Meeting subject')}/></FormField>
          </FormGrid>

          {form.members.length>0&&<div className="org-presence">
            <span>{L('Παρόντες','Present')}</span>
            {form.members.map(m=><label key={m.id}><input type="checkbox" checked={meeting.presentIds.includes(m.id)} onChange={()=>togglePresence(m.id)}/>{m.fullName}</label>)}
          </div>}

          <FormGrid columns={2}>
            <FormField label={L('Αποφάσεις','Decisions')}><textarea rows="3" value={meeting.decisions} onChange={e=>setMeeting({...meeting,decisions:e.target.value})}/></FormField>
            <FormField label={L('Πρακτικά','Minutes')}><textarea rows="3" value={meeting.minutes} onChange={e=>setMeeting({...meeting,minutes:e.target.value})}/></FormField>
          </FormGrid>

          <FormSection
            title={`${L('Ενέργειες αποφάσεων','Decision actions')} (${(meeting.actions||[]).length})`}
            description={L('Προαιρετικά μετατρέψτε αποφάσεις σε συγκεκριμένες ενέργειες με υπεύθυνο και προθεσμία.','Optionally convert decisions into specific actions with an owner and due date.')}
          >
            {(meeting.actions||[]).map(action=><div className="org-stack-row" key={action.id}>
              <input aria-label={L('Ενέργεια','Action')} placeholder={L('Ενέργεια','Action')} value={action.title||''} onChange={e=>updateAction(action.id,{title:e.target.value})}/>
              <select aria-label={L('Υπεύθυνος','Owner')} value={action.owner||''} onChange={e=>updateAction(action.id,{owner:e.target.value})}><option value="">{L('Επιλέξτε υπεύθυνο','Select owner')}</option>{form.members.map(m=><option key={m.id} value={m.fullName}>{m.fullName}</option>)}</select>
              <input aria-label={L('Προθεσμία','Due date')} type="date" value={action.dueDate||''} onChange={e=>updateAction(action.id,{dueDate:e.target.value})}/>
              <select aria-label={L('Κατάσταση ενέργειας','Action status')} value={action.status||'Ανοικτή'} onChange={e=>updateAction(action.id,{status:e.target.value})}>
                {ACTION_STATUSES.map(x=><option key={x} value={x}>{committeeDisplayValue(x,language)}</option>)}
              </select>
              <Button type="button" variant="ghost" size="sm" icon={<Trash2 size={14}/>} onClick={()=>removeAction(action.id)}>{L('Αφαίρεση','Remove')}</Button>
            </div>)}
            <div className="org-section-action"><Button type="button" variant="secondary" icon={<Plus size={15}/>} onClick={addAction}>{L('Προσθήκη ενέργειας','Add action')}</Button></div>
          </FormSection>

          <FormField label={L('Αρχεία συνεδρίασης','Meeting files')}><AttachmentManager value={meeting.attachments} onChange={value=>setMeeting({...meeting,attachments:value})}/></FormField>
          <div className="org-section-action"><Button type="button" variant="secondary" icon={<Plus size={15}/>} onClick={addMeeting}>{L('Προσθήκη συνεδρίασης','Add meeting')}</Button></div>

          <div className="org-stack-list">
            {form.meetings.length?form.meetings.map(mt=><div className="org-stack-row org-stack-row--meeting" key={mt.id}>
              <div className="org-stack-row__main">
                <strong>{mt.title}</strong>
                <small>
                  {displayDate(mt.date,language)} · {(mt.presentIds||[]).length} {L('παρόντες','present')} · {(mt.attachments||[]).length} {L('αρχεία','files')} · {(mt.actions||[]).length} {L('ενέργειες','actions')}
                </small>
                {mt.decisions&&<p>{mt.decisions}</p>}
              </div>
              <Badge tone="success">{L('Οριστικοποιημένη','Finalized')}</Badge>
            </div>):<div className="org-empty">{L('Δεν υπάρχουν συνεδριάσεις.','No meetings recorded.')}</div>}
          </div>
        </FormSection>

        <FormSection title={L('Συνημμένα επιτροπής','Committee attachments')}><AttachmentManager value={form.attachments} onChange={value=>setField('attachments',value)}/></FormSection>
        <FormSection title={L('Σημειώσεις','Notes')}><FormField><textarea rows="5" value={form.notes||''} onChange={e=>setField('notes',e.target.value)}/></FormField></FormSection>
      </form>
    </Drawer>
  </PageChrome>
}

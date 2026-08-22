import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { Badge, EntityCell } from '../../components/core'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { addInterval, loadCommittees, ORGANIZATION_EVENT } from '../../services/organizationService'
import { deleteOperationalCommittee, loadOperationalCommittees, saveOperationalCommittee } from '../../services/backend/organizationBackendService'
import { EMPLOYEES_EVENT, loadEmployees } from '../../services/employeesService'
import { useI18n } from '../../i18n'
import { committeeDisplayValue } from './committeePresentation'
import CommitteesView from './CommitteesView'
import './OrganizationUnified.css'

const EMPTY={name:'',type:'Επιτροπή',chair:'',secretary:'',lastMeeting:'',nextMeeting:'',status:'Ενεργή',frequency:'Μηνιαία',members:[],memberHistory:[],meetings:[],attachments:[],purpose:'',notes:''}
const EMPTY_MEETING={date:'',title:'',presentIds:[],agendaItems:[],minutes:'',decisions:'',actions:[],attachments:[],status:'Πρόχειρη',finalizedAt:'',finalizedBy:'',quorumOverrideReason:''}

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
  const [activeTab,setActiveTab]=useState('details')
  const memberEditsRef=useRef(new Map())

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
    memberEditsRef.current.clear()
    setEditing(null)
    setForm({...EMPTY,members:[],memberHistory:[],meetings:[],attachments:[]})
    setMeeting({...EMPTY_MEETING,agendaItems:[],actions:[],attachments:[]})
    setActiveTab('details')
    setOpen(true)
  }

  function openRecord(row){
    memberEditsRef.current.clear()
    setEditing(row)
    setForm({
      ...EMPTY,
      ...row,
      members:row.members||[],
      memberHistory:row.memberHistory||[],
      meetings:(row.meetings||[]).map(item=>({...item,agendaItems:item.agendaItems||[],actions:item.actions||[],attachments:item.attachments||[]})),
      attachments:row.attachments||[],
    })
    setMeeting({...EMPTY_MEETING,agendaItems:[],actions:[],attachments:[]})
    setActiveTab('details')
    setOpen(true)
  }

  function close(){
    memberEditsRef.current.clear()
    setOpen(false)
    setEditing(null)
    setForm(EMPTY)
    setMeeting({...EMPTY_MEETING,agendaItems:[],actions:[],attachments:[]})
    setActiveTab('details')
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
    const mergePendingMemberEdits=(members=[])=>members.map(member=>{
      const keys=[member.employeeId,member.relationalId,member.id,member.employeeId?`employee-${member.employeeId}`:''].filter(Boolean).map(String)
      const patch=keys.map(key=>memberEditsRef.current.get(key)).find(Boolean)
      return patch?{...member,...patch}:member
    })
    const membersForSave=mergePendingMemberEdits(form.members||[])
    const memberSignature=value=>JSON.stringify((value||[]).map(item=>({id:item.id,employeeId:item.employeeId||'',fullName:item.fullName||'',role:item.role||'',duties:item.duties||''})))
    const membershipChanged=Boolean(editing)&&memberSignature(editing.members)!==memberSignature(membersForSave)
    const saved={
      ...form,
      members:membersForSave,
      id:editing?.id||form.id,
      memberHistory:membershipChanged?[...(form.memberHistory||[]),{
        id:`membership-${Date.now()}`,
        changedAt:new Date().toISOString(),
        before:(editing.members||[]).map(item=>({...item})),
        after:membersForSave.map(item=>({...item})),
      }]:(form.memberHistory||[]),
      nextMeeting:form.nextMeeting||addInterval(form.lastMeeting,form.frequency),
    }
    try {
      const persisted=await saveOperationalCommittee(saved)
      const expectedMembers=Array.isArray(saved.members)?saved.members:[]
      const persistedMembers=Array.isArray(persisted?.members)?persisted.members:[]
      for(const expected of expectedMembers){
        const match=persistedMembers.find(item=>
          (expected.employeeId&&String(item.employeeId||'')===String(expected.employeeId))
          ||(expected.relationalId&&String(item.relationalId||'')===String(expected.relationalId))
          ||(!expected.employeeId&&!expected.relationalId&&String(item.fullName||'').trim()===String(expected.fullName||'').trim())
        )
        if(!match)throw new Error(L('Δεν επιβεβαιώθηκε μέλος της επιτροπής στη Supabase.','A committee member was not confirmed in Supabase.'))
        if(String(match.role||'')!==String(expected.role||'') || String(match.duties||'')!==String(expected.duties||'')){
          throw new Error(L('Οι αλλαγές μέλους δεν επιβεβαιώθηκαν στη Supabase.','Committee member changes were not confirmed in Supabase.'))
        }
      }
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


  async function removeCommittee(){
    if(!editing)return
    if((form.meetings||[]).length){
      notifyAction(L('Η επιτροπή έχει ιστορικό συνεδριάσεων και δεν διαγράφεται. Χρησιμοποιήστε Αρχειοθέτηση ώστε να διατηρηθούν πρακτικά, αποφάσεις και παρουσίες.','This committee has meeting history and cannot be deleted. Use Archive to preserve minutes, decisions and attendance.'))
      return
    }
    if(!confirmAction(L('Να διαγραφεί οριστικά η επιτροπή;','Permanently delete this committee?')))return
    try{
      await deleteOperationalCommittee(editing.id)
      setRows(await loadOperationalCommittees())
      notifyAction(L('Η επιτροπή διαγράφηκε.','Committee deleted.'))
      close()
    }catch(error){
      console.error('Committee delete failed',error)
      notifyAction(L('Η διαγραφή της επιτροπής απέτυχε.','Committee could not be deleted.'))
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
      return {...c,members}
    })
  }

  function updateMember(memberKey,patch){
    const key=String(memberKey||'')
    const previous=memberEditsRef.current.get(key)||{}
    memberEditsRef.current.set(key,{...previous,...patch})
    setForm(c=>{
      let members=c.members.map(x=>{
        const matches=[
          x.id,
          x.employeeId,
          x.relationalId,
          x.employeeId?`employee-${x.employeeId}`:'',
        ].filter(Boolean).some(value=>String(value)===key)
        return matches?{...x,...patch}:x
      })
      if(patch.role==='Πρόεδρος') members=members.map(x=>{
        const isEdited=[x.id,x.employeeId,x.relationalId,x.employeeId?`employee-${x.employeeId}`:''].filter(Boolean).some(value=>String(value)===key)
        return !isEdited&&x.role==='Πρόεδρος'?{...x,role:'Μέλος'}:x
      })
      if(patch.role==='Γραμματέας') members=members.map(x=>{
        const isEdited=[x.id,x.employeeId,x.relationalId,x.employeeId?`employee-${x.employeeId}`:''].filter(Boolean).some(value=>String(value)===key)
        return !isEdited&&x.role==='Γραμματέας'?{...x,role:'Μέλος'}:x
      })
      const chair=members.find(x=>x.role==='Πρόεδρος')?.fullName||''
      const secretary=members.find(x=>x.role==='Γραμματέας')?.fullName||''
      return {...c,members,chair,secretary}
    })
  }

  function togglePresence(id){
    setMeeting(c=>({...c,presentIds:c.presentIds.includes(id)?c.presentIds.filter(x=>x!==id):[...c.presentIds,id]}))
  }

  function addAgendaItem(){
    setMeeting(c=>({...c,agendaItems:[...(c.agendaItems||[]),{id:`agenda-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,title:'',presenter:'',discussion:'',decision:''}]}))
  }

  function updateAgendaItem(id,patch){
    setMeeting(c=>({...c,agendaItems:(c.agendaItems||[]).map(item=>item.id===id?{...item,...patch}:item)}))
  }

  function removeAgendaItem(id){
    setMeeting(c=>({...c,agendaItems:(c.agendaItems||[]).filter(item=>item.id!==id)}))
  }

  function addAction(){
    setMeeting(c=>({...c,actions:[...(c.actions||[]),{id:`action-${Date.now()}`,title:'',owner:'',dueDate:'',status:'Ανοικτή',agendaItemId:''}]}))
  }

  function updateAction(id,patch){
    setMeeting(c=>({...c,actions:(c.actions||[]).map(a=>a.id===id?{...a,...patch}:a)}))
  }

  function removeAction(id){
    setMeeting(c=>({...c,actions:(c.actions||[]).filter(a=>a.id!==id)}))
  }

  async function updateFinalizedAction(meetingId,actionId,patch){
    if(!editing)return
    const now=new Date().toISOString()
    const meetings=(form.meetings||[]).map(mt=>{
      if(mt.id!==meetingId)return mt
      return {
        ...mt,
        actions:(mt.actions||[]).map(action=>{
          if(action.id!==actionId)return action
          const next={...action,...patch,updatedAt:now}
          if(patch.status==='Ολοκληρωμένη' && action.status!=='Ολοκληρωμένη'){
            next.completedAt=now
            next.completedBy=L('Τρέχων χρήστης','Current user')
          }else if(patch.status && patch.status!=='Ολοκληρωμένη'){
            next.completedAt=''
            next.completedBy=''
          }
          return next
        }),
      }
    })
    const saved={...form,meetings}
    try{
      await saveOperationalCommittee(saved)
      setForm(saved)
      setEditing(saved)
      setRows(await loadOperationalCommittees())
      notifyAction(L('Η ενέργεια ενημερώθηκε.','Action updated.'))
    }catch(error){
      console.error('Committee action update failed',error)
      notifyAction(L('Η ενημέρωση της ενέργειας απέτυχε.','Action could not be updated.'))
    }
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
    const agendaItems=(meeting.agendaItems||[]).filter(item=>String(item.title||'').trim())
    if(!String(meeting.title||'').trim() && !agendaItems.length){
      notifyAction(L('Συμπληρώστε θέμα συνεδρίασης ή τουλάχιστον ένα θέμα ημερήσιας διάταξης.','Enter a meeting subject or at least one agenda item.'))
      return
    }
    if(!String(meeting.minutes||'').trim()){
      notifyAction(L('Συμπληρώστε σύντομα πρακτικά της συνεδρίασης.','Add brief meeting minutes.'))
      return
    }
    const decisionActions=(meeting.actions||[]).filter(a=>String(a.title||'').trim())
    const incompleteActions=decisionActions.filter(a=>!String(a.owner||'').trim()||!a.dueDate)
    if(incompleteActions.length){
      notifyAction(L('Κάθε ενέργεια απόφασης χρειάζεται υπεύθυνο και προθεσμία πριν οριστικοποιηθεί η συνεδρίαση.','Every decision action needs an owner and due date before the meeting is finalized.'))
      return
    }
    const attendanceSnapshot=(form.members||[]).map(member=>({
      memberId:member.id,
      employeeId:member.employeeId||'',
      fullName:member.fullName||'',
      role:member.role||'Μέλος',
      department:member.department||'',
      capacity:member.capacity||'',
      present:(meeting.presentIds||[]).includes(member.id),
    }))
    const item={
      ...meeting,
      id:`meeting-${Date.now()}`,
      title:meeting.title||`${L('Συνεδρίαση','Meeting')} ${displayDate(meeting.date,language)}`,
      attendance:attendanceSnapshot,
      agendaItems,
      actions:decisionActions,
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
    setMeeting({...EMPTY_MEETING,agendaItems:[],actions:[],attachments:[]})
  }

  return <CommitteesView vm={{language,L,metrics,search,setSearch,type,setType,status,setStatus,types,selected,setSelectedKeys,exportColumns,columns,filtered,sort,setSort,openNew,open,close,editing,form,activeTab,setActiveTab,save,removeCommittee,archiveCommittee,setField,memberSelectorValue,setMembers,employees,updateMember,meeting,setMeeting,addAgendaItem,updateAgendaItem,removeAgendaItem,addAction,updateAction,removeAction,togglePresence,addMeeting,updateFinalizedAction}} />
}

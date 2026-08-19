import { confirmAction, notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { Archive, BookOpenCheck, Check, Download, GraduationCap, Plus, Printer, UserCheck } from 'lucide-react'
import {
  Badge, Button, DateRangeFilter, Drawer, EntityCell, EntitySummary, FormActions, FormField, FormGrid, FormSection,
  LibraryField, ListWorkspace, PageChrome, PageHeader, StatCard,
} from '../../components/core'
import AttachmentManager from '../../components/core/AttachmentManager/AttachmentManager'
import HybridMultiSelector from '../../components/core/HybridMultiSelector/HybridMultiSelector'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { normalizeText, selectedRows, sortRows } from '../../core/utils/entityList'
import { loadTraining, ORGANIZATION_EVENT } from '../../services/organizationService'
import { loadOperationalTraining, saveOperationalTraining } from '../../services/backend/organizationBackendService'
import { EMPLOYEES_EVENT, loadEmployees } from '../../services/employeesService'
import { useRecordDeepLink } from '../../core/navigation/recordDeepLink'
import { masterNames } from '../../services/masterDataService'
import { useI18n } from '../../i18n'
import { trainingDisplayValue } from './trainingPresentation'
import './OrganizationUnified.css'

const EMPTY={
  title:'', category:'Κλινική εκπαίδευση', department:'', trainer:'', date:'',
  status:'Προγραμματισμένη', durationHours:'1', validUntil:'', mandatory:false, recurrenceMonths:'', competencyRequired:false, attendance:[], attachments:[], notes:'',
}
const STATUSES=['Προγραμματισμένη','Σε εξέλιξη','Ολοκληρωμένη','Ακυρωμένη']
const CATEGORIES=['Κλινική εκπαίδευση','Ασφάλεια','Ποιότητα','Εισαγωγική','Υποχρεωτική']
const ATTENDANCE_STATUSES=['Παρών','Απών','Δικαιολογημένος','Online','Δεν ολοκλήρωσε']

function displayDate(value,language='el'){
  if(!value) return '—'
  const date=new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())?value:date.toLocaleDateString(language==='en'?'en-GB':'el-GR')
}

export default function TrainingPage(){
  const { language }=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const navigateTitle=L('Εκπαιδεύσεις','Training')
  const [rows,setRows]=useState(loadTraining)
  useEffect(()=>{loadOperationalTraining().then(setRows).catch(()=>{})},[])
  const [employees,setEmployees]=useState(loadEmployees)
  const [search,setSearch]=useState('')
  const [status,setStatus]=useState('')
  const [department,setDepartment]=useState('')
  const [from,setFrom]=useState('')
  const [to,setTo]=useState('')
  const [sort,setSort]=useState({key:'date',direction:'desc'})
  const [selectedKeys,setSelectedKeys]=useState([])
  const [open,setOpen]=useState(false)
  const [editing,setEditing]=useState(null)
  const [form,setForm]=useState(EMPTY)
  const notificationLink=useRecordDeepLink(rows)

  useAppEvents([ORGANIZATION_EVENT, EMPLOYEES_EVENT], () => {
    loadOperationalTraining().then(setRows).catch(()=>{})
    setEmployees(loadEmployees())
  })

  const departments=masterNames('departments')
  const filtered=useMemo(()=>{
    const q=normalizeText(search)
    return sortRows(rows.filter(r=>
      (!status||r.status===status) &&
      (!department||r.department===department) &&
      (!from||r.date>=from) &&
      (!to||r.date<=to) &&
      (!q||normalizeText([r.title,r.category,r.department,r.trainer].filter(Boolean).join(' ')).includes(q))
    ),sort)
  },[rows,search,status,department,from,to,sort])

  const selected=useMemo(()=>selectedRows(filtered,selectedKeys),[filtered,selectedKeys])
  const metrics=useMemo(()=>({
    total:filtered.length,
    scheduled:filtered.filter(r=>r.status==='Προγραμματισμένη').length,
    completed:filtered.filter(r=>r.status==='Ολοκληρωμένη').length,
    attended:filtered.reduce((n,r)=>n+(r.attendance||[]).filter(x=>['Παρών','Online'].includes(x.status)).length,0),
    competencyDue:filtered.reduce((n,r)=>n+(r.attendance||[]).filter(x=>r.competencyRequired && ['Παρών','Online'].includes(x.status) && x.competencyResult!=='Επαρκής').length,0),
    renewalDue:filtered.reduce((n,r)=>n+(r.attendance||[]).filter(x=>['Παρών','Online'].includes(x.status) && (x.competencyValidUntil||r.validUntil) && (x.competencyValidUntil||r.validUntil) < new Date().toISOString().slice(0,10)).length,0),
  }),[filtered])

  const attendeeKey=item=>String(item.employeeId||item.attendeeId||item.id||'')
  const selectorValue=useMemo(()=>(form.attendance||[]).map(item=>({
    id:item.employeeId||item.attendeeId,
    name:item.employeeName,
    meta:[item.department,item.professionalCategory].filter(Boolean).join(' · '),
    manual:!!item.manual,
    values:{name:item.employeeName||'',department:item.department||'',role:item.professionalCategory||''},
  })),[form.attendance])

  const exportColumns=[
    {label:L('Εκπαίδευση','Training'),value:r=>r.title||''},
    {label:L('Κατηγορία','Category'),value:r=>trainingDisplayValue(r.category,language)||''},
    {label:L('Τμήμα','Department'),value:r=>r.department||''},
    {label:L('Ημερομηνία','Date'),value:r=>r.date||''},
    {label:L('Εκπαιδευτής','Trainer'),value:r=>r.trainer||''},
    {label:L('Παρόντες','Attended'),value:r=>(r.attendance||[]).filter(x=>['Παρών','Online'].includes(x.status)).length},
    {label:L('Σύνολο','Total'),value:r=>(r.attendance||[]).length},
    {label:L('Κατάσταση','Status'),value:r=>trainingDisplayValue(r.status,language)||''},
  ]

  const columns=[
    {key:'title',label:L('Εκπαίδευση','Training'),sortable:true,render:r=><EntityCell primary={r.title} secondary={trainingDisplayValue(r.category,language)}/>},
    {key:'department',label:L('Τμήμα','Department'),sortable:true,render:r=>r.department||L('Όλα τα τμήματα','All departments')},
    {key:'date',label:L('Ημερομηνία','Date'),width:'130px',sortable:true,render:r=>displayDate(r.date,language)},
    {key:'trainer',label:L('Εκπαιδευτής','Trainer'),sortable:true},
    {key:'attendance',label:L('Παρουσίες','Attendance'),width:'110px',render:r=>`${(r.attendance||[]).filter(x=>['Παρών','Online'].includes(x.status)).length}/${(r.attendance||[]).length}`},
    {key:'attachments',label:L('Υλικό','Material'),width:'80px',render:r=>(r.attachments||[]).length},
    {key:'status',label:L('Κατάσταση','Status'),width:'150px',render:r=><Badge tone={r.status==='Ολοκληρωμένη'?'success':r.status==='Ακυρωμένη'?'danger':r.status==='Σε εξέλιξη'?'warning':'neutral'}>{trainingDisplayValue(r.status,language)}</Badge>},
  ]

  const setField=(name,value)=>setForm(c=>({...c,[name]:value}))

  function openNew(){
    setEditing(null)
    setForm({...EMPTY,date:new Date().toISOString().slice(0,10)})
    setOpen(true)
  }

  function openRecord(row){
    notificationLink.markOpened(row.id)
    setEditing(row)
    setForm({...EMPTY,...row,attendance:row.attendance||[],attachments:row.attachments||[]})
    setOpen(true)
  }

  function close(){
    notificationLink.completeReview()
    setOpen(false)
    setEditing(null)
    setForm(EMPTY)
  }

  async function save(e){
    e.preventDefault()
    if(!String(form.title||'').trim() || !form.date){
      notifyAction(L('Συμπληρώστε τίτλο και ημερομηνία εκπαίδευσης.','Enter training title and date.'))
      return
    }
    const duplicate=rows.find(r=>
      String(r.id)!==String(editing?.id||'') &&
      normalizeText(r.title)===normalizeText(form.title) &&
      String(r.date||'')===String(form.date||'')
    )
    if(duplicate){
      notifyAction(L('Υπάρχει ήδη εκπαίδευση με τον ίδιο τίτλο και ημερομηνία.','Training with the same title and date already exists.'))
      return
    }
    if(form.status==='Ολοκληρωμένη' && !(form.attendance||[]).length){
      notifyAction(L('Για ολοκληρωμένη εκπαίδευση καταχωρήστε τουλάχιστον έναν συμμετέχοντα ή αλλάξτε την κατάσταση.','For completed training, add at least one participant or change the status.'))
      return
    }
    if(form.status==='Ολοκληρωμένη' && form.competencyRequired){
      const assessed=(form.attendance||[]).filter(x=>['Παρών','Online'].includes(x.status))
      const pending=assessed.filter(x=>!x.competencyResult)
      if(pending.length){notifyAction(L('Για εκπαίδευση με αξιολόγηση επάρκειας, καταγράψτε αποτέλεσμα για όλους όσοι ολοκλήρωσαν.','For competency-assessed training, record a result for everyone who completed it.'));return}
      const missingEvidence=assessed.filter(x=>!String(x.assessedBy||'').trim()||!x.assessedAt)
      if(missingEvidence.length){notifyAction(L('Για κάθε αξιολόγηση επάρκειας απαιτούνται αξιολογητής και ημερομηνία αξιολόγησης.','Every competency assessment requires an assessor and assessment date.'));return}
      const competentWithoutValidity=assessed.filter(x=>x.competencyResult==='Επαρκής'&&!x.competencyValidUntil&&!form.validUntil)
      if(competentWithoutValidity.length){notifyAction(L('Για αποτέλεσμα «Επαρκής» ορίστε ημερομηνία ισχύος επάρκειας ή γενική ισχύ πιστοποίησης.','For a Competent result, set competency validity or overall certification validity.'));return}
      const retrainingWithoutPlan=assessed.filter(x=>x.competencyResult==='Χρειάζεται επανεκπαίδευση'&&!String(x.competencyNotes||'').trim())
      if(retrainingWithoutPlan.length){notifyAction(L('Για όσους χρειάζονται επανεκπαίδευση καταγράψτε σημείωση/σχέδιο επανεκπαίδευσης.','For staff requiring retraining, record a retraining note/plan.'));return}
    }
    try {
      await saveOperationalTraining({...form,id:editing?.id||form.id,durationHours:String(form.durationHours||'')})
      setRows(await loadOperationalTraining())
      close()
    } catch (error) {
      console.error('Training save failed', error)
      notifyAction(L('Η αποθήκευση της εκπαίδευσης απέτυχε.','Training could not be saved.'))
    }
  }

  async function archiveRecord(){
    if(!editing||!confirmAction(L('Να αρχειοθετηθεί η εκπαίδευση; Το ιστορικό και οι συμμετοχές θα διατηρηθούν.','Archive this training record? History and attendance will be retained.'))) return
    try {
      await saveOperationalTraining({...form,id:editing.id,status:'Ακυρωμένη',archived:true,archivedAt:new Date().toISOString()})
      setRows(await loadOperationalTraining())
      close()
    } catch (error) {
      console.error('Training archive failed', error)
      notifyAction(L('Η αρχειοθέτηση της εκπαίδευσης απέτυχε.','Training could not be archived.'))
    }
  }

  function setAttendees(selection){
    setForm(c=>{
      const current=new Map((c.attendance||[]).map(item=>[attendeeKey(item),item]))
      const attendance=selection.map(entry=>{
        const key=String(entry.id)
        const existing=current.get(key)||{}
        const source=entry.source||{}
        return {
          ...existing,
          employeeId:entry.manual?'':entry.id,
          attendeeId:entry.manual?entry.id:'',
          employeeName:entry.name,
          department:entry.manual?(entry.values?.department||''):(source.department||existing.department||''),
          professionalCategory:entry.manual?(entry.values?.role||''):(source.professionalCategory||existing.professionalCategory||''),
          manual:!!entry.manual,
          status:existing.status||'Παρών',
          score:existing.score||'',
          certificate:existing.certificate||null,
          competencyResult:existing.competencyResult||'',
          assessedBy:existing.assessedBy||'',
          assessedAt:existing.assessedAt||'',
          competencyNotes:existing.competencyNotes||'',
          competencyValidUntil:existing.competencyValidUntil||'',
        }
      })
      return {...c,attendance}
    })
  }

  function updateAttendance(id,patch){
    setForm(c=>({...c,attendance:c.attendance.map(x=>attendeeKey(x)===String(id)?{...x,...patch,...(patch.competencyResult?{competencyStatus:patch.competencyResult==='Επαρκής'?'closed':'retraining_required',competencyUpdatedAt:new Date().toISOString()}: {})}:x)}))
  }

  return <PageChrome className="organization-unified-page" header={<PageHeader
    title={L('Εκπαίδευση','Training')}
    description={L('Προγραμματισμός, παρουσιολόγιο, αποτελέσματα και εκπαιδευτικό υλικό σε κοινή ροή.','Scheduling, attendance, results and training material in one workflow.')}
    actions={<Button icon={<Plus size={17}/>} onClick={openNew}>{L('Νέα εκπαίδευση','New training')}</Button>}
  />}>
    <ListWorkspace
      stats={<EntitySummary columns={6}>
        <StatCard compact icon={GraduationCap} label={L('Εκπαιδεύσεις','Training records')} value={metrics.total}/>
        <StatCard compact icon={BookOpenCheck} label={L('Προγραμματισμένες','Scheduled')} value={metrics.scheduled}/>
        <StatCard compact icon={Check} label={L('Ολοκληρωμένες','Completed')} value={metrics.completed}/>
        <StatCard compact icon={UserCheck} label={L('Παρουσίες','Attendance')} value={metrics.attended}/>
        <StatCard compact icon={Check} label={L('Εκκρεμής επάρκεια','Competency due')} value={metrics.competencyDue}/>
        <StatCard compact icon={BookOpenCheck} label={L('Ληγμένη / επανεκπαίδευση','Expired / retraining')} value={metrics.renewalDue} tone={metrics.renewalDue?'warning':'default'}/>
      </EntitySummary>}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={L('Αναζήτηση εκπαίδευσης, τμήματος ή εκπαιδευτή…','Search training, department or trainer…')}
      activeFilterCount={[search,status,department,from,to].filter(Boolean).length}
      onClearFilters={()=>{setSearch('');setStatus('');setDepartment('');setFrom('');setTo('')}}
      filters={<>
        <select value={status} onChange={e=>setStatus(e.target.value)} aria-label={L('Κατάσταση','Status')}>
          <option value="">{L('Όλες οι καταστάσεις','All statuses')}</option>
          {STATUSES.map(x=><option key={x} value={x}>{trainingDisplayValue(x,language)}</option>)}
        </select>
        <select value={department} onChange={e=>setDepartment(e.target.value)} aria-label={L('Τμήμα','Department')}>
          <option value="">{L('Όλα τα τμήματα','All departments')}</option>
          {departments.map(x=><option key={x}>{x}</option>)}
        </select>
        <DateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo}/>
      </>}
      selectedCount={selected.length}
      selectedLabel={L('εκπαιδεύσεις','training records')}
      onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<>
        <Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={()=>printRows({title:navigateTitle,columns:exportColumns,rows:selected})}>{L('Εκτύπωση / PDF','Print / PDF')}</Button>
        <Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={()=>downloadCsv({filename:'training.csv',columns:exportColumns,rows:selected})}>{L('Εξαγωγή CSV','Export CSV')}</Button>
      </>}
      columns={columns}
      rows={filtered}
      getRowKey={r=>r.id}
      onRowClick={openRecord}
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
      sort={sort}
      onSortChange={setSort}
      ariaLabel={L('Εκπαιδεύσεις','Training')}
      footer={<span>{filtered.length} {L('εγγραφές','records')}</span>}
      emptyTitle={L('Δεν υπάρχουν εκπαιδεύσεις','No training records')}
      highlightedKey={notificationLink.highlightedId}
    />

    <Drawer
      open={open}
      onClose={close}
      title={editing?L('Επεξεργασία εκπαίδευσης','Edit training'):L('Νέα εκπαίδευση','New training')}
      description={L('Στοιχεία, παρουσιολόγιο και αρχεία στην ίδια scrollable καρτέλα.','Details, attendance and files in the same scrollable record.')}
      width={1180}
      position="center"
      footer={<FormActions form="training-form" onCancel={close} extraActions={editing?<Button variant="secondary" icon={<Archive size={16}/>} onClick={archiveRecord}>{L('Αρχειοθέτηση','Archive')}</Button>:null}/>}
    >
      <form id="training-form" className="organization-unified-form" onSubmit={save}>
        <FormSection title={L('Βασικά στοιχεία','Basic details')}>
          <FormGrid columns={2}>
            <FormField label={L('Τίτλος','Title')} required><input required value={form.title} onChange={e=>setField('title',e.target.value)}/></FormField>
            <FormField label={L('Κατηγορία','Category')}><select value={form.category} onChange={e=>setField('category',e.target.value)}>{CATEGORIES.map(x=><option key={x} value={x}>{trainingDisplayValue(x,language)}</option>)}</select></FormField>
            <FormField label={L('Τμήμα','Department')}><LibraryField hideLabel libraryKey="departments" value={form.department} onChange={value=>setField('department',value)} placeholder={L('Επιλέξτε ή γράψτε τμήμα','Select or enter department')}/></FormField>
            <FormField label={L('Εκπαιδευτής','Trainer')}><input value={form.trainer} onChange={e=>setField('trainer',e.target.value)}/></FormField>
            <FormField label={L('Ημερομηνία','Date')} required><input type="date" required value={form.date} onChange={e=>setField('date',e.target.value)}/></FormField>
            <FormField label={L('Διάρκεια (ώρες)','Duration (hours)')}><input inputMode="decimal" value={form.durationHours} onChange={e=>setField('durationHours',e.target.value)} placeholder={L('π.χ. 1,5','e.g. 1.5')}/></FormField>
            <FormField label={L('Κατάσταση','Status')}><select value={form.status} onChange={e=>setField('status',e.target.value)}>{STATUSES.map(x=><option key={x} value={x}>{trainingDisplayValue(x,language)}</option>)}</select></FormField>
            <FormField label={L('Ισχύς πιστοποίησης έως','Certification valid until')}><input type="date" value={form.validUntil||''} onChange={e=>setField('validUntil',e.target.value)}/></FormField>
            <FormField label={L('Υποχρεωτική εκπαίδευση','Mandatory training')}><label className="org-inline-check"><input type="checkbox" checked={!!form.mandatory} onChange={e=>setField('mandatory',e.target.checked)}/><span>{L('Παρακολούθηση συμμόρφωσης προσωπικού','Track staff compliance')}</span></label></FormField>
            <FormField label={L('Επανάληψη κάθε (μήνες)','Repeat every (months)')}><input type="number" min="1" value={form.recurrenceMonths||''} onChange={e=>setField('recurrenceMonths',e.target.value)} placeholder={L('π.χ. 12','e.g. 12')}/></FormField>
            <FormField label={L('Αξιολόγηση επάρκειας','Competency assessment')}>
              <label className="org-inline-check"><input type="checkbox" checked={!!form.competencyRequired} onChange={e=>setField('competencyRequired',e.target.checked)}/><span>{L('Απαιτείται για αυτή την εκπαίδευση','Required for this training')}</span></label>
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title={`${L('Παρουσιολόγιο','Attendance')} (${form.attendance.length})`}
          description={L('Προσθέστε συμμετέχοντες από το μητρώο προσωπικού ή χειροκίνητα και καταγράψτε παρουσία / αποτέλεσμα.','Add participants from the staff registry or manually and record attendance / result.')}
        >
          <HybridMultiSelector
            items={employees.filter(item=>item.status!=='Ανενεργό')}
            selected={selectorValue}
            onChange={setAttendees}
            label={L('Συμμετέχοντες','Participants')}
            getName={item=>item.fullName||''}
            getMeta={item=>[item.department,item.professionalCategory].filter(Boolean).join(' · ')}
            manualFields={[
              {key:'name',label:L('Ονοματεπώνυμο','Full name'),required:true},
              {key:'department',label:L('Τμήμα','Department')},
              {key:'role',label:L('Ιδιότητα','Professional category')},
            ]}
          />
          {form.attendance.length>0&&<div className="org-attendance-list org-attendance-list--selected">
            {form.attendance.map(att=><div className="org-attendance-row is-selected" key={attendeeKey(att)}>
              <div className="org-stack-row__main">
                <strong>{att.employeeName}</strong>
                <small>{[
                  att.department,
                  att.professionalCategory,
                  trainingDisplayValue(att.manual?'Χειροκίνητη καταχώρηση':'Από μητρώο προσωπικού',language),
                ].filter(Boolean).join(' · ')}</small>
              </div>
              <select value={att.status} onChange={e=>updateAttendance(attendeeKey(att),{status:e.target.value})} aria-label={L('Παρουσία','Attendance status')}>
                {ATTENDANCE_STATUSES.map(x=><option key={x} value={x}>{trainingDisplayValue(x,language)}</option>)}
              </select>
              <input className="org-score" inputMode="decimal" value={att.score||''} onChange={e=>updateAttendance(attendeeKey(att),{score:e.target.value})} placeholder={L('Βαθμός','Score')}/>
              {form.competencyRequired&&<select value={att.competencyResult||''} onChange={e=>updateAttendance(attendeeKey(att),{competencyResult:e.target.value,assessedAt:e.target.value?new Date().toISOString():att.assessedAt})} aria-label={L('Αποτέλεσμα επάρκειας','Competency result')}>
                <option value="">{L('Αξιολόγηση…','Assessment…')}</option>
                <option value="Επαρκής">{L('Επαρκής','Competent')}</option>
                <option value="Χρειάζεται επανεκπαίδευση">{L('Χρειάζεται επανεκπαίδευση','Retraining required')}</option>
              </select>}
            </div>)}
          </div>}
          {form.competencyRequired&&form.attendance.some(att=>['Παρών','Online'].includes(att.status))&&<div className="org-competency-followup">
            <div className="org-competency-followup__title">{L('Στοιχεία αξιολόγησης επάρκειας','Competency assessment details')}</div>
            {form.attendance.filter(att=>['Παρών','Online'].includes(att.status)).map(att=><div className="org-competency-followup__card" key={`competency-${attendeeKey(att)}`}>
              <div className="org-competency-followup__person"><strong>{att.employeeName}</strong><small>{[att.department,att.professionalCategory].filter(Boolean).join(' · ')}</small>{att.competencyResult&&<small>{att.competencyResult==='Επαρκής'?L('Closed-loop: επάρκεια τεκμηριωμένη','Closed-loop: competency documented'):L('Open follow-up: απαιτείται επανεκπαίδευση','Open follow-up: retraining required')}</small>}</div>
              <div className="org-competency-followup__fields">
                <label><span>{L('Αξιολογητής','Assessed by')}</span><input value={att.assessedBy||''} onChange={e=>updateAttendance(attendeeKey(att),{assessedBy:e.target.value})}/></label>
                <label><span>{L('Ημερομηνία αξιολόγησης','Assessment date')}</span><input type="date" value={(att.assessedAt||'').slice(0,10)} onChange={e=>updateAttendance(attendeeKey(att),{assessedAt:e.target.value})}/></label>
                <label><span>{L('Επάρκεια έως','Competency valid until')}</span><input type="date" value={att.competencyValidUntil||''} onChange={e=>updateAttendance(attendeeKey(att),{competencyValidUntil:e.target.value})}/></label>
                <label className="org-competency-followup__notes"><span>{L('Σημείωση επάρκειας / επανεκπαίδευσης','Competency / retraining note')}</span><input value={att.competencyNotes||''} onChange={e=>updateAttendance(attendeeKey(att),{competencyNotes:e.target.value})}/></label>
              </div>
            </div>)}
          </div>}
        </FormSection>

        <FormSection title={L('Εκπαιδευτικό υλικό & συνημμένα','Training material & attachments')}>
          <AttachmentManager
            value={form.attachments}
            onChange={value=>setField('attachments',value)}
            hint={L('Παρουσιάσεις, παρουσιολόγια, πιστοποιητικά ή άλλο υλικό','Presentations, attendance sheets, certificates or other material')}
          />
        </FormSection>

        <FormSection title={L('Σημειώσεις','Notes')}>
          <FormField><textarea rows="5" value={form.notes||''} onChange={e=>setField('notes',e.target.value)}/></FormField>
        </FormSection>
      </form>
    </Drawer>
  </PageChrome>
}

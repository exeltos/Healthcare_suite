import { useEffect, useMemo, useState } from 'react'
import { useServiceCollection } from '../../core/hooks'
import { useOutletContext } from 'react-router-dom'
import { BarChart3, CheckCircle2, Download, Hand, ListChecks, Plus, Printer, TrendingUp, Users, XCircle } from 'lucide-react'
import {
  Badge,
  Button,
  Drawer,
  EntityCell,
  EntitySummary,
  FormGrid,
  FormSection,
  ListWorkspace,
  PageChrome,
  PageHeader,
  StatCard,
} from '../../components/core'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { HAND_HYGIENE_EVENT, loadHandHygieneSessions } from '../../services/preventionService'
import { loadPreventionRecords } from '../../services/backend/preventionBackendService'
import './PreventionUnified.css'
import { masterNames } from '../../services/masterDataService'
import { useI18n } from '../../i18n'
import { loadCurrentProfile } from '../../services/profile/profileService'
import { filterRowsByDepartmentScope } from '../../services/accessControlService'
import { preventionDisplayValue } from './preventionPresentation'

const MOMENT_LABELS = {
  moment1: '1. Πριν την επαφή με τον ασθενή', moment2: '2. Πριν από καθαρό / άσηπτο χειρισμό', moment3: '3. Μετά από κίνδυνο έκθεσης σε σωματικά υγρά', moment4: '4. Μετά την επαφή με τον ασθενή', moment5: '5. Μετά την επαφή με το περιβάλλον του ασθενούς',
}
const ACTION_LABELS = { HR: 'Αλκοολούχο αντισηπτικό', HW: 'Πλύσιμο χεριών', MISSED: 'Καμία ενέργεια' }
function normalizeDate(value){if(!value)return'';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const parts=String(value).split(/[/.-]/);return parts.length===3&&parts[2]?.length===4?`${parts[2]}-${String(parts[1]).padStart(2,'0')}-${String(parts[0]).padStart(2,'0')}`:value}
function displayDate(value,language='el'){const normalized=normalizeDate(value);if(!normalized)return'—';const date=new Date(`${normalized}T12:00:00`);return Number.isNaN(date.getTime())?value:date.toLocaleDateString(language==='en'?'en-GB':'el-GR')}
function isCompliant(observation){if(observation.action)return observation.action==='HR'||observation.action==='HW';return observation.compliant==='Ναι'}
function getSessionStats(session){const observations=session.observations||[];const compliant=observations.filter(isCompliant).length;const missed=Math.max(0,observations.length-compliant);const rate=observations.length?Math.round((compliant/observations.length)*1000)/10:0;return{opportunities:observations.length,compliant,missed,rate}}
function rateTone(rate){if(rate>=90)return'success';if(rate>=75)return'warning';return'danger'}

export default function HandHygienePage(){
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const { openNewEntryLauncher }=useOutletContext()
  const [records, refreshRecords, setRecords] = useServiceCollection(loadHandHygieneSessions, HAND_HYGIENE_EVENT)
  useEffect(()=>{loadPreventionRecords('hand_hygiene').then(setRecords).catch(()=>{})},[])
  const [mode,setMode]=useState('sessions')
  const [search,setSearch]=useState('')
  const [department,setDepartment]=useState('')
  const [category,setCategory]=useState('')
  const [moment,setMoment]=useState('')
  const [result,setResult]=useState('')
  const [dateFrom,setDateFrom]=useState('')
  const [dateTo,setDateTo]=useState('')
  const [sort,setSort]=useState({key:'date',direction:'desc'})
  const [selectedKeys,setSelectedKeys]=useState([])
  const [selectedSession,setSelectedSession]=useState(null)
  const currentUser=useMemo(()=>loadCurrentProfile(language),[language])
  const scopedRecords=useMemo(()=>filterRowsByDepartmentScope(records,currentUser,row=>row.department),[records,currentUser])

  
  useEffect(()=>setSelectedKeys([]),[mode])

  const departments=masterNames('departments').filter(item=>currentUser?.scopeMode==='all'||currentUser?.role==='admin'||currentUser?.role==='infection_lead'||(currentUser?.scopeMode==='selected'?(currentUser.scopeDepartments||[]).includes(item):!currentUser?.department||currentUser.department===item))
  const categories=useMemo(()=>[...new Set(scopedRecords.flatMap(item=>item.observations||[]).map(item=>item.professionalCategory).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'el')),[records])
  const filteredSessions=useMemo(()=>{const query=normalizeText(search);return sortRows(scopedRecords.filter(session=>{const sessionDate=normalizeDate(session.date);const observations=session.observations||[];const haystack=normalizeText([session.id,session.department,session.ward,session.observer,session.facility,...observations.flatMap(item=>[item.professionalCode,item.professionalCategory,preventionDisplayValue(MOMENT_LABELS[item.moment], language)])].filter(Boolean).join(' '));return(!query||haystack.includes(query))&&(!department||session.department===department)&&(!category||observations.some(item=>item.professionalCategory===category))&&(!moment||observations.some(item=>item.moment===moment))&&(!result||observations.some(item=>result==='compliant'?isCompliant(item):!isCompliant(item)))&&(!dateFrom||sessionDate>=dateFrom)&&(!dateTo||sessionDate<=dateTo)}),sort)},[records,search,department,category,moment,result,dateFrom,dateTo,sort])
  const filteredObservations=useMemo(()=>filteredSessions.flatMap(session=>(session.observations||[]).filter(item=>!category||item.professionalCategory===category).filter(item=>!moment||item.moment===moment).filter(item=>!result||(result==='compliant'?isCompliant(item):!isCompliant(item))).map((item,index)=>({...item,_key:`${session.id}-${item.id||index}`,session}))),[filteredSessions,category,moment,result])
  const summary=useMemo(()=>{const opportunities=filteredObservations.length;const compliant=filteredObservations.filter(isCompliant).length;const missed=opportunities-compliant;const rate=opportunities?Math.round((compliant/opportunities)*1000)/10:0;return{sessions:filteredSessions.length,opportunities,compliant,missed,rate,departments:new Set(filteredSessions.map(item=>item.department).filter(Boolean)).size}},[filteredSessions,filteredObservations])
  const visibleRows=mode==='sessions'?filteredSessions:filteredObservations
  const selected=useMemo(()=>selectedRows(visibleRows,selectedKeys,mode==='sessions'?(row)=>row.id:(row)=>row._key),[visibleRows,selectedKeys,mode])

  function clearFilters(){setSearch('');setDepartment('');setCategory('');setMoment('');setResult('');setDateFrom('');setDateTo('')}
  const activeFilterCount=[search,department,category,moment,result,dateFrom,dateTo].filter(Boolean).length

  const sessionColumns=[
    {key:'date',label:L('Ημερομηνία','Date'),width:'140px',sortable:true,render:row=><EntityCell primary={displayDate(row.date,language)} secondary={[row.startTime,row.endTime].filter(Boolean).join(' – ')}/>},
    {key:'department',label:L('Τμήμα','Department'),sortable:true,render:row=><EntityCell primary={row.department||'—'} secondary={row.ward||''}/>},
    {key:'observer',label:L('Παρατηρητής','Observer'),sortable:true,render:row=>row.observer||'—'},
    {key:'opportunities',label:L('Παρατηρήσεις','Observations'),width:'125px',render:row=>getSessionStats(row).opportunities},
    {key:'compliant',label:L('Συμμορφώσεις','Compliant'),width:'135px',render:row=>getSessionStats(row).compliant},
    {key:'rate',label:L('Ποσοστό','Rate'),width:'120px',render:row=>{const stats=getSessionStats(row);return <Badge tone={rateTone(stats.rate)}>{stats.rate}%</Badge>}},
  ]
  const observationColumns=[
    {key:'date',label:L('Ημερομηνία','Date'),width:'135px',render:row=>displayDate(row.session.date,language)},
    {key:'department',label:L('Τμήμα','Department'),render:row=>row.session.department||'—'},
    {key:'professionalCode',label:L('Επαγγελματίας','Professional'),render:row=><EntityCell primary={row.professionalCode||row.employeeName||'—'} secondary={row.professionalCategory||''}/>},
    {key:'moment',label:'WHO Moment',render:row=>MOMENT_LABELS[row.moment]||row.moment||'—'},
    {key:'action',label:L('Ενέργεια','Action'),render:row=>ACTION_LABELS[row.action]||row.action||'—'},
    {key:'result',label:L('Αποτέλεσμα','Result'),width:'145px',render:row=><Badge tone={isCompliant(row)?'success':'danger'}>{isCompliant(row)?L('Συμμόρφωση','Compliant'):L('Μη συμμόρφωση','Non-compliant')}</Badge>},
  ]

  const sessionExport=[{label:L('Ημερομηνία','Date'),value:r=>r.date||''},{label:L('Τμήμα','Department'),value:r=>r.department||''},{label:L('Παρατηρητής','Observer'),value:r=>r.observer||''},{label:L('Παρατηρήσεις','Observations'),value:r=>getSessionStats(r).opportunities},{label:L('Συμμορφώσεις','Compliant'),value:r=>getSessionStats(r).compliant},{label:L('Ποσοστό','Rate'),value:r=>`${getSessionStats(r).rate}%`}]
  const observationExport=[{label:L('Ημερομηνία','Date'),value:r=>r.session.date||''},{label:L('Τμήμα','Department'),value:r=>r.session.department||''},{label:L('Επαγγελματίας','Professional'),value:r=>r.professionalCode||r.employeeName||''},{label:'Κατηγορία',value:r=>r.professionalCategory||''},{label:'WHO Moment',value:r=>MOMENT_LABELS[r.moment]||r.moment||''},{label:L('Ενέργεια','Action'),value:r=>ACTION_LABELS[r.action]||r.action||''},{label:L('Αποτέλεσμα','Result'),value:r=>isCompliant(r)?L('Συμμόρφωση','Compliant'):L('Μη συμμόρφωση','Non-compliant')}]
  function printSelected(){printRows({title:mode==='sessions'?L('Υγιεινή Χεριών — Συνεδρίες','Hand Hygiene — Sessions'):L('Υγιεινή Χεριών — Παρατηρήσεις','Hand Hygiene — Observations'),columns:mode==='sessions'?sessionExport:observationExport,rows:selected})}
  function exportSelected(){downloadCsv({filename:`ygieini-xerion-${mode}-${new Date().toISOString().slice(0,10)}.csv`,columns:mode==='sessions'?sessionExport:observationExport,rows:selected})}

  return <PageChrome className="prevention-unified-page" header={<PageHeader title={L('Υγιεινή Χεριών','Hand Hygiene')} description={L('Συνεδρίες παρατήρησης και συμμόρφωση στις 5 στιγμές WHO.','Observation sessions and compliance with the WHO 5 Moments.')} actions={<Button icon={<Plus size={17}/>} onClick={()=>openNewEntryLauncher('hand-hygiene')}>{L('Νέα παρατήρηση WHO','New WHO observation')}</Button>}/> }>
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel={L('Σύνολα υγιεινής χεριών','Hand hygiene totals')}><StatCard compact icon={TrendingUp} label={L('Συμμόρφωση','Compliance')} value={`${summary.rate}%`}/><StatCard compact icon={ListChecks} label={L('Παρατηρήσεις','Observations')} value={summary.opportunities}/><StatCard compact icon={XCircle} label={L('Μη συμμορφώσεις','Non-compliant')} value={summary.missed}/><StatCard compact icon={Users} label={L('Τμήματα','Departments')} value={summary.departments}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder={L('Αναζήτηση τμήματος, παρατηρητή ή επαγγελματία…','Search department, observer or professional…')}
      activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
      filters={<><select value={mode} onChange={e=>setMode(e.target.value)} aria-label={L('Προβολή','View')}><option value="sessions">{L('Συνεδρίες WHO','WHO sessions')}</option><option value="observations">{L('Παρατηρήσεις','Observations')}</option></select><select value={department} onChange={e=>setDepartment(e.target.value)} aria-label={L('Τμήμα','Department')}><option value="">{L('Όλα τα τμήματα','All departments')}</option>{departments.map(item=><option key={item}>{item}</option>)}</select><select value={category} onChange={e=>setCategory(e.target.value)} aria-label={L('Κατηγορία','Category')}><option value="">{L('Όλες οι κατηγορίες','All categories')}</option>{categories.map(item=><option key={item}>{item}</option>)}</select><select value={result} onChange={e=>setResult(e.target.value)} aria-label={L('Αποτέλεσμα','Result')}><option value="">{L('Όλα τα αποτελέσματα','All results')}</option><option value="compliant">{L('Συμμόρφωση','Compliant')}</option><option value="missed">{L('Μη συμμόρφωση','Non-compliant')}</option></select><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} aria-label={L('Από ημερομηνία','From date')}/><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} aria-label={L('Έως ημερομηνία','To date')}/></>}
      selectedCount={selected.length} selectedLabel={mode==='sessions'?L('συνεδρίες','sessions'):L('παρατηρήσεις','observations')} onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>{L('Εκτύπωση / PDF','Print / PDF')}</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>{L('Εξαγωγή CSV','Export CSV')}</Button></>}
      columns={mode==='sessions'?sessionColumns:observationColumns} rows={visibleRows} getRowKey={mode==='sessions'?(row)=>row.id:(row)=>row._key} onRowClick={row=>setSelectedSession(mode==='sessions'?row:row.session)} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel={L('Υγιεινή χεριών','Hand hygiene')} footer={<span>{visibleRows.length} {mode==='sessions'?L('συνεδρίες','sessions'):L('παρατηρήσεις','observations')}</span>} emptyTitle={mode==='sessions'?L('Δεν υπάρχουν συνεδρίες','No sessions'):L('Δεν υπάρχουν παρατηρήσεις','No observations')}
    />

    <Drawer open={Boolean(selectedSession)} onClose={()=>setSelectedSession(null)} title={L('Συνεδρία WHO','WHO session')} description={selectedSession?`${displayDate(selectedSession.date,language)} · ${selectedSession.department||L('Χωρίς τμήμα','No department')}`:''} width={1080} position="center">
      {selectedSession&&<div className="prevention-unified-form who-session-card">
        <EntitySummary columns={4} ariaLabel={L('Σύνολα συνεδρίας','Session totals')}><StatCard compact icon={Hand} label={L('Παρατηρήσεις','Observations')} value={getSessionStats(selectedSession).opportunities}/><StatCard compact icon={CheckCircle2} label={L('Συμμορφώσεις','Compliant')} value={getSessionStats(selectedSession).compliant}/><StatCard compact icon={XCircle} label={L('Μη συμμορφώσεις','Non-compliant')} value={getSessionStats(selectedSession).missed}/><StatCard compact icon={BarChart3} label="Ποσοστό" value={`${getSessionStats(selectedSession).rate}%`}/></EntitySummary>
        <FormSection className="who-session-details" title={L('Στοιχεία συνεδρίας','Session details')}><FormGrid columns={2}><div className="prevention-readonly"><span>{L('Μονάδα','Facility')}</span><strong>{selectedSession.facility||'—'}</strong></div><div className="prevention-readonly"><span>{L('Τμήμα / περιοχή','Department / area')}</span><strong>{[selectedSession.department,selectedSession.ward].filter(Boolean).join(' · ')||'—'}</strong></div><div className="prevention-readonly"><span>{L('Παρατηρητής','Observer')}</span><strong>{selectedSession.observer||'—'}</strong></div><div className="prevention-readonly"><span>{L('Ώρα','Time')}</span><strong>{[selectedSession.startTime,selectedSession.endTime].filter(Boolean).join(' – ')||'—'}</strong></div></FormGrid></FormSection>
        <FormSection className="who-session-observations" title={L('Επιμέρους παρατηρήσεις','Individual observations')}><div className="prevention-observation-list">{(selectedSession.observations||[]).map((item,index)=><article key={item.id||index}><span className="prevention-observation-index">{index+1}</span><div><strong>{item.professionalCode||item.employeeName||L('Χωρίς κωδικό','No code')}</strong><small>{item.professionalCategory||'—'}</small><p>{preventionDisplayValue(MOMENT_LABELS[item.moment], language)||item.moment||'—'}</p></div><div><span>{preventionDisplayValue(ACTION_LABELS[item.action], language)||item.action||'—'}</span><Badge tone={isCompliant(item)?'success':'danger'}>{isCompliant(item)?L('Συμμόρφωση','Compliant'):L('Μη συμμόρφωση','Non-compliant')}</Badge></div></article>)}</div></FormSection>
      </div>}
    </Drawer>
  </PageChrome>
}
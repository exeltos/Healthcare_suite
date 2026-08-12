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
import './PreventionUnified.css'
import { masterNames } from '../../services/masterDataService'

const MOMENT_LABELS = {
  moment1: '1. Πριν την επαφή με τον ασθενή', moment2: '2. Πριν από καθαρό / άσηπτο χειρισμό', moment3: '3. Μετά από κίνδυνο έκθεσης σε σωματικά υγρά', moment4: '4. Μετά την επαφή με τον ασθενή', moment5: '5. Μετά την επαφή με το περιβάλλον του ασθενούς',
}
const ACTION_LABELS = { HR: 'Αλκοολούχο αντισηπτικό', HW: 'Πλύσιμο χεριών', MISSED: 'Καμία ενέργεια' }
function normalizeDate(value){if(!value)return'';if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const parts=String(value).split(/[/.-]/);return parts.length===3&&parts[2]?.length===4?`${parts[2]}-${String(parts[1]).padStart(2,'0')}-${String(parts[0]).padStart(2,'0')}`:value}
function displayDate(value){const normalized=normalizeDate(value);if(!normalized)return'—';const date=new Date(`${normalized}T12:00:00`);return Number.isNaN(date.getTime())?value:date.toLocaleDateString('el-GR')}
function isCompliant(observation){if(observation.action)return observation.action==='HR'||observation.action==='HW';return observation.compliant==='Ναι'}
function getSessionStats(session){const observations=session.observations||[];const compliant=observations.filter(isCompliant).length;const missed=Math.max(0,observations.length-compliant);const rate=observations.length?Math.round((compliant/observations.length)*1000)/10:0;return{opportunities:observations.length,compliant,missed,rate}}
function rateTone(rate){if(rate>=90)return'success';if(rate>=75)return'warning';return'danger'}

export default function HandHygienePage(){
  const { openNewEntryLauncher }=useOutletContext()
  const [records, refreshRecords, setRecords] = useServiceCollection(loadHandHygieneSessions, HAND_HYGIENE_EVENT)
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

  
  useEffect(()=>setSelectedKeys([]),[mode])

  const departments=masterNames('departments')
  const categories=useMemo(()=>[...new Set(records.flatMap(item=>item.observations||[]).map(item=>item.professionalCategory).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'el')),[records])
  const filteredSessions=useMemo(()=>{const query=normalizeText(search);return sortRows(records.filter(session=>{const sessionDate=normalizeDate(session.date);const observations=session.observations||[];const haystack=normalizeText([session.id,session.department,session.ward,session.observer,session.facility,...observations.flatMap(item=>[item.professionalCode,item.professionalCategory,MOMENT_LABELS[item.moment]])].filter(Boolean).join(' '));return(!query||haystack.includes(query))&&(!department||session.department===department)&&(!category||observations.some(item=>item.professionalCategory===category))&&(!moment||observations.some(item=>item.moment===moment))&&(!result||observations.some(item=>result==='compliant'?isCompliant(item):!isCompliant(item)))&&(!dateFrom||sessionDate>=dateFrom)&&(!dateTo||sessionDate<=dateTo)}),sort)},[records,search,department,category,moment,result,dateFrom,dateTo,sort])
  const filteredObservations=useMemo(()=>filteredSessions.flatMap(session=>(session.observations||[]).filter(item=>!category||item.professionalCategory===category).filter(item=>!moment||item.moment===moment).filter(item=>!result||(result==='compliant'?isCompliant(item):!isCompliant(item))).map((item,index)=>({...item,_key:`${session.id}-${item.id||index}`,session}))),[filteredSessions,category,moment,result])
  const summary=useMemo(()=>{const opportunities=filteredObservations.length;const compliant=filteredObservations.filter(isCompliant).length;const missed=opportunities-compliant;const rate=opportunities?Math.round((compliant/opportunities)*1000)/10:0;return{sessions:filteredSessions.length,opportunities,compliant,missed,rate,departments:new Set(filteredSessions.map(item=>item.department).filter(Boolean)).size}},[filteredSessions,filteredObservations])
  const visibleRows=mode==='sessions'?filteredSessions:filteredObservations
  const selected=useMemo(()=>selectedRows(visibleRows,selectedKeys,mode==='sessions'?(row)=>row.id:(row)=>row._key),[visibleRows,selectedKeys,mode])

  function clearFilters(){setSearch('');setDepartment('');setCategory('');setMoment('');setResult('');setDateFrom('');setDateTo('')}
  const activeFilterCount=[search,department,category,moment,result,dateFrom,dateTo].filter(Boolean).length

  const sessionColumns=[
    {key:'date',label:'Ημερομηνία',width:'140px',sortable:true,render:row=><EntityCell primary={displayDate(row.date)} secondary={[row.startTime,row.endTime].filter(Boolean).join(' – ')}/>},
    {key:'department',label:'Τμήμα',sortable:true,render:row=><EntityCell primary={row.department||'—'} secondary={row.ward||''}/>},
    {key:'observer',label:'Παρατηρητής',sortable:true,render:row=>row.observer||'—'},
    {key:'opportunities',label:'Παρατηρήσεις',width:'125px',render:row=>getSessionStats(row).opportunities},
    {key:'compliant',label:'Συμμορφώσεις',width:'135px',render:row=>getSessionStats(row).compliant},
    {key:'rate',label:'Ποσοστό',width:'120px',render:row=>{const stats=getSessionStats(row);return <Badge tone={rateTone(stats.rate)}>{stats.rate}%</Badge>}},
  ]
  const observationColumns=[
    {key:'date',label:'Ημερομηνία',width:'135px',render:row=>displayDate(row.session.date)},
    {key:'department',label:'Τμήμα',render:row=>row.session.department||'—'},
    {key:'professionalCode',label:'Επαγγελματίας',render:row=><EntityCell primary={row.professionalCode||row.employeeName||'—'} secondary={row.professionalCategory||''}/>},
    {key:'moment',label:'WHO Moment',render:row=>MOMENT_LABELS[row.moment]||row.moment||'—'},
    {key:'action',label:'Ενέργεια',render:row=>ACTION_LABELS[row.action]||row.action||'—'},
    {key:'result',label:'Αποτέλεσμα',width:'145px',render:row=><Badge tone={isCompliant(row)?'success':'danger'}>{isCompliant(row)?'Συμμόρφωση':'Μη συμμόρφωση'}</Badge>},
  ]

  const sessionExport=[{label:'Ημερομηνία',value:r=>r.date||''},{label:'Τμήμα',value:r=>r.department||''},{label:'Παρατηρητής',value:r=>r.observer||''},{label:'Παρατηρήσεις',value:r=>getSessionStats(r).opportunities},{label:'Συμμορφώσεις',value:r=>getSessionStats(r).compliant},{label:'Ποσοστό',value:r=>`${getSessionStats(r).rate}%`}]
  const observationExport=[{label:'Ημερομηνία',value:r=>r.session.date||''},{label:'Τμήμα',value:r=>r.session.department||''},{label:'Επαγγελματίας',value:r=>r.professionalCode||r.employeeName||''},{label:'Κατηγορία',value:r=>r.professionalCategory||''},{label:'WHO Moment',value:r=>MOMENT_LABELS[r.moment]||r.moment||''},{label:'Ενέργεια',value:r=>ACTION_LABELS[r.action]||r.action||''},{label:'Αποτέλεσμα',value:r=>isCompliant(r)?'Συμμόρφωση':'Μη συμμόρφωση'}]
  function printSelected(){printRows({title:mode==='sessions'?'Υγιεινή Χεριών — Συνεδρίες':'Υγιεινή Χεριών — Παρατηρήσεις',columns:mode==='sessions'?sessionExport:observationExport,rows:selected})}
  function exportSelected(){downloadCsv({filename:`ygieini-xerion-${mode}-${new Date().toISOString().slice(0,10)}.csv`,columns:mode==='sessions'?sessionExport:observationExport,rows:selected})}

  return <PageChrome className="prevention-unified-page" header={<PageHeader title="Υγιεινή Χεριών" description="Συνεδρίες παρατήρησης και συμμόρφωση στις 5 στιγμές WHO." actions={<Button icon={<Plus size={17}/>} onClick={()=>openNewEntryLauncher('hand-hygiene')}>Νέα παρατήρηση WHO</Button>}/> }>
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel="Σύνολα υγιεινής χεριών"><StatCard compact icon={TrendingUp} label="Συμμόρφωση" value={`${summary.rate}%`}/><StatCard compact icon={ListChecks} label="Παρατηρήσεις" value={summary.opportunities}/><StatCard compact icon={XCircle} label="Μη συμμορφώσεις" value={summary.missed}/><StatCard compact icon={Users} label="Τμήματα" value={summary.departments}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση τμήματος, παρατηρητή ή επαγγελματία…"
      activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
      filters={<><select value={mode} onChange={e=>setMode(e.target.value)} aria-label="Προβολή"><option value="sessions">Συνεδρίες WHO</option><option value="observations">Παρατηρήσεις</option></select><select value={department} onChange={e=>setDepartment(e.target.value)} aria-label="Τμήμα"><option value="">Όλα τα τμήματα</option>{departments.map(item=><option key={item}>{item}</option>)}</select><select value={category} onChange={e=>setCategory(e.target.value)} aria-label="Κατηγορία"><option value="">Όλες οι κατηγορίες</option>{categories.map(item=><option key={item}>{item}</option>)}</select><select value={result} onChange={e=>setResult(e.target.value)} aria-label="Αποτέλεσμα"><option value="">Όλα τα αποτελέσματα</option><option value="compliant">Συμμόρφωση</option><option value="missed">Μη συμμόρφωση</option></select><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} aria-label="Από ημερομηνία"/><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} aria-label="Έως ημερομηνία"/></>}
      selectedCount={selected.length} selectedLabel={mode==='sessions'?'συνεδρίες':'παρατηρήσεις'} onClearSelection={()=>setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>Εξαγωγή CSV</Button></>}
      columns={mode==='sessions'?sessionColumns:observationColumns} rows={visibleRows} getRowKey={mode==='sessions'?(row)=>row.id:(row)=>row._key} onRowClick={row=>setSelectedSession(mode==='sessions'?row:row.session)} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel="Υγιεινή χεριών" footer={<span>{visibleRows.length} {mode==='sessions'?'συνεδρίες':'παρατηρήσεις'}</span>} emptyTitle={mode==='sessions'?'Δεν υπάρχουν συνεδρίες':'Δεν υπάρχουν παρατηρήσεις'}
    />

    <Drawer open={Boolean(selectedSession)} onClose={()=>setSelectedSession(null)} title="Συνεδρία WHO" description={selectedSession?`${displayDate(selectedSession.date)} · ${selectedSession.department||'Χωρίς τμήμα'}`:''} width={1080} position="center">
      {selectedSession&&<div className="prevention-unified-form">
        <EntitySummary columns={4} ariaLabel="Σύνολα συνεδρίας"><StatCard compact icon={Hand} label="Παρατηρήσεις" value={getSessionStats(selectedSession).opportunities}/><StatCard compact icon={CheckCircle2} label="Συμμορφώσεις" value={getSessionStats(selectedSession).compliant}/><StatCard compact icon={XCircle} label="Μη συμμορφώσεις" value={getSessionStats(selectedSession).missed}/><StatCard compact icon={BarChart3} label="Ποσοστό" value={`${getSessionStats(selectedSession).rate}%`}/></EntitySummary>
        <FormSection title="Στοιχεία συνεδρίας"><FormGrid columns={2}><div className="prevention-readonly"><span>Μονάδα</span><strong>{selectedSession.facility||'—'}</strong></div><div className="prevention-readonly"><span>Τμήμα / περιοχή</span><strong>{[selectedSession.department,selectedSession.ward].filter(Boolean).join(' · ')||'—'}</strong></div><div className="prevention-readonly"><span>Παρατηρητής</span><strong>{selectedSession.observer||'—'}</strong></div><div className="prevention-readonly"><span>Ώρα</span><strong>{[selectedSession.startTime,selectedSession.endTime].filter(Boolean).join(' – ')||'—'}</strong></div></FormGrid></FormSection>
        <FormSection title="Επιμέρους παρατηρήσεις"><div className="prevention-observation-list">{(selectedSession.observations||[]).map((item,index)=><article key={item.id||index}><span className="prevention-observation-index">{index+1}</span><div><strong>{item.professionalCode||item.employeeName||'Χωρίς κωδικό'}</strong><small>{item.professionalCategory||'—'}</small><p>{MOMENT_LABELS[item.moment]||item.moment||'—'}</p></div><div><span>{ACTION_LABELS[item.action]||item.action||'—'}</span><Badge tone={isCompliant(item)?'success':'danger'}>{isCompliant(item)?'Συμμόρφωση':'Μη συμμόρφωση'}</Badge></div></article>)}</div></FormSection>
      </div>}
    </Drawer>
  </PageChrome>
}
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, ClipboardList, Download, Printer, ShieldCheck, Target } from 'lucide-react'
import { Button, EntitySummary, PageChrome, PageHeader, StatCard } from '../../components/core'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { loadCapa, loadIncidents, loadRisks, loadAuditExecutions } from '../../services/qualityService'
import { loadQualityAudits, loadQualityCapa, loadQualityIncidents, loadQualityRisks } from '../../services/backend/qualityBackendService'
import { hydrateIndicatorBackend } from '../../services/backend/indicatorBackendService'
import { loadIndicatorsSnapshot } from '../../services/indicatorsService'
import { useI18n } from '../../i18n'
import './QualityPages.css'

export default function QualityReportsPage(){
  const { language }=useI18n(); const L=(el,en)=>language==='en'?en:el
  const [report,setReport]=useState('management'); const [version,setVersion]=useState(0)
  useEffect(()=>{Promise.all([loadQualityIncidents(),loadQualityCapa(),loadQualityAudits(),loadQualityRisks(),hydrateIndicatorBackend()]).then(()=>setVersion(v=>v+1)).catch(()=>{})},[])
  const data=useMemo(()=>({incidents:loadIncidents(),capa:loadCapa(),audits:loadAuditExecutions(),risks:loadRisks(),indicators:loadIndicatorsSnapshot()}),[version])
  const reportRows=useMemo(()=>buildReportRows(report,data,L),[report,data,language])
  const columns=report==='management'
    ? [{label:L('Περιοχή','Area'),value:r=>r.area},{label:L('Σύνολο','Total'),value:r=>r.total},{label:L('Ανοικτά / Εκτός στόχου','Open / Outside target'),value:r=>r.open},{label:L('Σχόλιο','Comment'),value:r=>r.comment}]
    : [{label:L('Τίτλος','Title'),value:r=>r.title},{label:L('Κατάσταση','Status'),value:r=>r.status},{label:L('Ημερομηνία','Date'),value:r=>r.date},{label:L('Υπεύθυνος','Owner'),value:r=>r.owner}]
  const today=new Date().toISOString().slice(0,10)
  const openCapa=data.capa.filter(x=>!['Ολοκληρωμένη','Ακυρωμένη'].includes(x.status)).length
  const overdueCapa=data.capa.filter(x=>x.dueDate&&x.dueDate<today&&!['Ολοκληρωμένη','Ακυρωμένη'].includes(x.status)).length
  const ineffective=data.capa.filter(x=>['Μερικώς αποτελεσματική','Μη αποτελεσματική'].includes(x.effectivenessStatus)).length
  const openFindings=data.audits.flatMap(a=>a.findings||[]).filter(f=>(f.status||'Ανοικτό')!=='Κλειστό').length
  const highRisks=data.risks.filter(r=>Number(r.residualScore||r.riskScore)>=10&&!['Κλειστός','Ακυρωμένος'].includes(r.status)).length
  const outsideTarget=data.indicators.filter(indicatorOutsideTarget).length
  const reports=[
    {id:'management',icon:ShieldCheck,title:L('Σύνοψη Διοίκησης','Management summary'),text:L('Συμβάντα, CAPA, audits, κίνδυνοι και δείκτες σε μία εικόνα.','Incidents, CAPA, audits, risks and indicators in one view.')},
    {id:'incidents',icon:ClipboardList,title:L('Αναφορά Συμβάντων','Incident report'),text:`${data.incidents.length} ${L('εγγραφές','records')}`},
    {id:'capa',icon:CheckCircle2,title:L('Αναφορά CAPA','CAPA report'),text:`${data.capa.length} ${L('ενέργειες','actions')}`},
    {id:'audits',icon:ClipboardCheck,title:'Audit',text:`${openFindings} ${L('ανοικτά ευρήματα','open findings')}`},
    {id:'risks',icon:Target,title:L('Κίνδυνοι','Risks'),text:`${highRisks} ${L('υψηλοί υπολειπόμενοι','high residual')}`},
    {id:'indicators',icon:BarChart3,title:L('Πίνακας Δεικτών','Indicator dashboard'),text:`${data.indicators.length} ${L('δείκτες','indicators')}`},
  ]
  const selectedReport=reports.find(x=>x.id===report)
  function doPrint(){printRows({title:selectedReport.title,columns,rows:reportRows})}
  function doCsv(){downloadCsv({filename:`quality-report-${report}.csv`,columns,rows:reportRows})}
  return <PageChrome className="quality-page quality-reports-page" header={<PageHeader title={L('Αναφορές Ποιότητας','Quality Reports')} description={L('Σύνοψη διοίκησης και αναφορές από τα πραγματικά δεδομένα του συστήματος Ποιότητας.','Management summary and reports generated from actual Quality system data.')} actions={<><Button variant="secondary" icon={<Printer size={17}/>} onClick={doPrint}>{L('Εκτύπωση / PDF','Print / PDF')}</Button><Button variant="secondary" icon={<Download size={17}/>} onClick={doCsv}>{L('Εξαγωγή CSV','Export CSV')}</Button></>}/> }>
    <EntitySummary columns={6}>
      <StatCard compact icon={ClipboardList} label={L('Συμβάντα','Incidents')} value={data.incidents.length}/>
      <StatCard compact icon={CheckCircle2} label={L('Ανοικτές CAPA','Open CAPA')} value={openCapa} tone={openCapa?'warning':'default'}/>
      <StatCard compact icon={AlertTriangle} label={L('Εκπρόθεσμες CAPA','Overdue CAPA')} value={overdueCapa} tone={overdueCapa?'warning':'default'}/>
      <StatCard compact icon={ClipboardCheck} label={L('Ανοικτά ευρήματα','Open findings')} value={openFindings} tone={openFindings?'warning':'default'}/>
      <StatCard compact icon={Target} label={L('Υψηλοί κίνδυνοι','High risks')} value={highRisks} tone={highRisks?'warning':'default'}/>
      <StatCard compact icon={BarChart3} label={L('Εκτός στόχου','Outside target')} value={outsideTarget} tone={outsideTarget?'warning':'default'}/>
    </EntitySummary>
    {ineffective>0&&<div className="quality-management-alert"><AlertTriangle size={18}/><span>{ineffective} {L('CAPA χρειάζονται επανεξέταση αποτελεσματικότητας.','CAPA require effectiveness follow-up.')}</span></div>}
    <div className="quality-actions">{reports.map(item=>{const Icon=item.icon;return <button type="button" className={`quality-card quality-report-card ${report===item.id?'is-active':''}`} key={item.id} onClick={()=>setReport(item.id)}><Icon size={20}/><h3>{item.title}</h3><p>{item.text}</p></button>})}</div>
    <section className="quality-report-preview"><div className="quality-report-preview__head"><div><span>{L('ΠΡΟΕΠΙΣΚΟΠΗΣΗ','PREVIEW')}</span><h2>{selectedReport.title}</h2></div><strong>{reportRows.length} {L('γραμμές','rows')}</strong></div>
      {report==='management'?<div className="quality-report-table"><table><thead><tr><th>{L('Περιοχή','Area')}</th><th>{L('Σύνολο','Total')}</th><th>{L('Ανοικτά / Εκτός στόχου','Open / Outside target')}</th><th>{L('Σχόλιο','Comment')}</th></tr></thead><tbody>{reportRows.map(row=><tr key={row.area}><td>{row.area}</td><td>{row.total}</td><td>{row.open}</td><td>{row.comment}</td></tr>)}</tbody></table></div>:<div className="quality-report-table"><table><thead><tr><th>{L('Τίτλος','Title')}</th><th>{L('Κατάσταση','Status')}</th><th>{L('Ημερομηνία','Date')}</th><th>{L('Υπεύθυνος','Owner')}</th></tr></thead><tbody>{reportRows.length?reportRows.map((row,index)=><tr key={`${row.title}-${index}`}><td>{row.title}</td><td>{row.status}</td><td>{row.date}</td><td>{row.owner}</td></tr>):<tr><td colSpan="4">{L('Δεν υπάρχουν δεδομένα για την αναφορά.','No data available for this report.')}</td></tr>}</tbody></table></div>}
    </section>
  </PageChrome>
}

function buildReportRows(report,data,L){
  const today=new Date().toISOString().slice(0,10)
  if(report==='management'){
    const openIncidents=data.incidents.filter(x=>!['Κλειστό','Ακυρωμένο'].includes(x.status)).length
    const openCapa=data.capa.filter(x=>!['Ολοκληρωμένη','Ακυρωμένη'].includes(x.status)).length
    const overdue=data.capa.filter(x=>x.dueDate&&x.dueDate<today&&!['Ολοκληρωμένη','Ακυρωμένη'].includes(x.status)).length
    const findings=data.audits.flatMap(a=>a.findings||[]); const openFindings=findings.filter(f=>(f.status||'Ανοικτό')!=='Κλειστό').length
    const highRisks=data.risks.filter(r=>Number(r.residualScore||r.riskScore)>=10&&!['Κλειστός','Ακυρωμένος'].includes(r.status)).length
    const outside=data.indicators.filter(indicatorOutsideTarget).length
    return [
      {area:L('Συμβάντα','Incidents'),total:data.incidents.length,open:openIncidents,comment:openIncidents?L('Απαιτούν διερεύνηση / παρακολούθηση','Require investigation / follow-up'):L('Χωρίς ανοικτές εκκρεμότητες','No open items')},
      {area:'CAPA',total:data.capa.length,open:openCapa,comment:overdue?`${overdue} ${L('εκπρόθεσμες','overdue')}`:L('Χωρίς εκπρόθεσμες ενέργειες','No overdue actions')},
      {area:L('Ευρήματα Audit','Audit findings'),total:findings.length,open:openFindings,comment:openFindings?L('Απαιτούν ενέργεια ή επαλήθευση CAPA','Require action or CAPA verification'):L('Όλα κλειστά','All closed')},
      {area:L('Κίνδυνοι','Risks'),total:data.risks.length,open:highRisks,comment:highRisks?L('Υψηλό υπολειπόμενο ρίσκο','High residual risk'):L('Χωρίς υψηλό υπολειπόμενο ρίσκο','No high residual risk')},
      {area:L('Δείκτες','Indicators'),total:data.indicators.length,open:outside,comment:outside?L('Δείκτες εκτός στόχου','Indicators outside target'):L('Οι διαθέσιμοι δείκτες είναι εντός στόχου','Available indicators are within target')},
    ]
  }
  if(report==='incidents')return data.incidents.map(x=>({title:x.title||x.category||'—',status:x.status||'—',date:x.date||x.createdAt||'—',owner:x.owner||'—'}))
  if(report==='capa')return data.capa.map(x=>({title:x.title||x.description||'—',status:`${x.status||'—'} · ${x.effectivenessStatus||L('Χωρίς επαλήθευση','No verification')}`,date:x.dueDate||x.createdAt||'—',owner:x.owner||'—'}))
  if(report==='audits')return data.audits.flatMap(a=>(a.findings||[]).map(f=>({title:`${a.templateName||'Audit'} · ${f.title||L('Εύρημα','Finding')}`,status:f.status||L('Ανοικτό','Open'),date:a.date||'—',owner:a.auditor||a.owner||'—'})))
  if(report==='risks')return data.risks.map(x=>({title:x.title||'—',status:`${x.status||'—'} · ${L('Υπολειπόμενο','Residual')} ${Number(x.residualScore||0)}`,date:x.reviewDate||x.updatedAt||'—',owner:x.owner||'—'}))
  return data.indicators.map(x=>({title:x.name||x.title||x.code||'—',status:indicatorOutsideTarget(x)?L('Εκτός στόχου','Outside target'):L('Εντός στόχου','Within target'),date:x.period||x.updatedAt||'—',owner:x.owner||x.department||'—'}))
}
function indicatorOutsideTarget(item){const value=Number(item.value??item.currentValue),target=Number(item.target??item.targetValue);if(!Number.isFinite(value)||!Number.isFinite(target))return false;return item.direction==='higher'||item.direction==='up'?value<target:value>target}

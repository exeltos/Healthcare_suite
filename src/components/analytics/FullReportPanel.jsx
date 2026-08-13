import { useMemo, useState } from 'react'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import { loadIndicatorsSnapshot } from '../../services/indicatorsService'
import { loadIncidents } from '../../services/qualityService'
import { loadEnvironmentalSamples, loadStaffSamples, loadWaterRecords } from '../../services/laboratorySourcesService'
import { laboratoryStatus } from '../../core/constants/laboratory'
import './FullReportPanel.css'

const REGULATORY_GROUPS = [
  { id:'cr-acinetobacter', label:'Acinetobacter spp. — ανθεκτικό στις καρβαπενέμες', en:'Carbapenem-resistant Acinetobacter spp.', organism:/acinetobacter/i, resistance:/carbapen|CRE/i },
  { id:'cr-klebsiella', label:'Klebsiella spp. — ανθεκτική στις καρβαπενέμες', en:'Carbapenem-resistant Klebsiella spp.', organism:/klebsiella/i, resistance:/carbapen|CRE/i },
  { id:'cr-pseudomonas', label:'Pseudomonas spp. — ανθεκτική στις καρβαπενέμες', en:'Carbapenem-resistant Pseudomonas spp.', organism:/pseudomonas/i, resistance:/carbapen|CRE/i },
  { id:'mrsa', label:'Staphylococcus aureus — MRSA', en:'Staphylococcus aureus — MRSA', organism:/staphylococcus\s+aureus|s\.?\s*aureus/i, resistance:/MRSA/i },
  { id:'vre', label:'Enterococcus spp. — VRE', en:'Enterococcus spp. — VRE', organism:/enterococcus/i, resistance:/VRE/i },
]
const CARBAPENEMS=/meropen|μεροπεν|imipen|ιμιπεν|ertapen|ερταπεν/i
const RESISTANT=new Set(['MDR','XDR','PDR','CRE','MRSA','VRE','ESBL'])

function safeText(v){return String(v??'').trim()}
function dateOf(row){
  const raw=row?.resultDate||row?.collectionDate||row?.infectionDate||row?.onsetDate||row?.date||row?.startDate||row?.createdAt||''
  if(!raw)return null
  const text=String(raw).slice(0,10)
  const normalized=/^\d{4}-\d{2}-\d{2}$/.test(text)?text:(text.includes('/')?text.split('/').reverse().join('-'):text)
  const d=new Date(`${normalized}T12:00:00`)
  return Number.isNaN(d.getTime())?null:d
}
function inRange(row,start,end){const d=dateOf(row);return Boolean(d&&d>=start&&d<=end)}
function countMap(rows,keyFn){const map={};rows.forEach(r=>{const k=keyFn(r)||'—';map[k]=(map[k]||0)+1});return map}
function pairRows(aRows,bRows,keyFn){
  const a=countMap(aRows,keyFn),b=countMap(bRows,keyFn)
  return [...new Set([...Object.keys(a),...Object.keys(b)])].map(label=>({label,a:a[label]||0,b:b[label]||0})).sort((x,y)=>Math.max(y.a,y.b)-Math.max(x.a,x.b)||x.label.localeCompare(y.label,'el'))
}
function hasCarbapenemResistance(row){
  if(/CRE|carbapen/i.test(safeText(row.resistance)))return true
  return (row.antibiogram||[]).some(ab=>CARBAPENEMS.test(safeText(ab.antibiotic||ab.name))&&safeText(ab.sensitivity).toUpperCase()==='R')
}
function matchesRegulatory(row,group){const organism=safeText(row.microorganism);if(!group.organism.test(organism))return false;if(group.id.startsWith('cr-'))return hasCarbapenemResistance(row);return group.resistance.test(safeText(row.resistance))}
function periodRange(year,months,segment){const startMonth=months===12?0:segment*months;return{start:new Date(year,startMonth,1),end:new Date(year,startMonth+months,0,23,59,59),from:`${year}-${String(startMonth+1).padStart(2,'0')}-01`,to:`${year}-${String(startMonth+months).padStart(2,'0')}-${String(new Date(year,startMonth+months,0).getDate()).padStart(2,'0')}`}}
function pointKey(row){
  const source=safeText(row.sourceType).toLowerCase()
  // Never use patient/staff names as a specimen point. For environmental/water records
  // subjectName is the actual sampling location; otherwise sampleType is the clinical specimen.
  if(source.includes('περιβ')||source.includes('environment')||source.includes('νερ')||source.includes('water'))return row.subjectName||row.sampleType||row.sampleReason||'Χωρίς σημείο'
  return row.sampleType||row.sampleReason||'Χωρίς είδος δείγματος'
}
function pct(a,b){if(!b)return a?null:0;return Math.round((a-b)/b*100)}
function csvCell(v){return `"${safeText(v).replaceAll('"','""')}"`}
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}

function PairBarList({rows,yearA,yearB,empty='—',limit=14}){
  const data=rows.slice(0,limit);const max=Math.max(1,...data.flatMap(x=>[x.a,x.b]))
  if(!data.length)return <div className="full-report-empty">{empty}</div>
  return <div className="compare-bars">{data.map((row,index)=><div className="compare-bar-row" key={`${row.label}-${index}`}>
    <span title={row.label}>{row.label}</span>
    <div className="compare-bar-lines"><div><i className="a" style={{width:`${Math.max(row.a?3:0,row.a/max*100)}%`}}/><b>{row.a}</b></div><div><i className="b" style={{width:`${Math.max(row.b?3:0,row.b/max*100)}%`}}/><b>{row.b}</b></div></div>
    <small><em className="a-dot"/>{yearA}<em className="b-dot"/>{yearB}</small>
  </div>)}</div>
}

function CompareCard({label,a,b,yearA,yearB}){const change=pct(a,b);return <article className="analytics-compare-card"><small>{label}</small><div><span><b>{a}</b><em>{yearA}</em></span><span><b>{b}</b><em>{yearB}</em></span></div><footer>{change===null?'—':`${change>0?'+':''}${change}%`}</footer></article>}

export default function FullReportPanel({samples=[],infections=[],isolations=[],language='el',onClose}){
  const en=language==='en';const now=new Date();const years=Array.from({length:8},(_,i)=>now.getFullYear()-i)
  const [yearA,setYearA]=useState(now.getFullYear());const [yearB,setYearB]=useState(now.getFullYear()-1);const [months,setMonths]=useState(12);const [segment,setSegment]=useState(0);const [tab,setTab]=useState('overview')
  const segmentCount=months===12?1:12/months;const safeSegment=Math.min(segment,segmentCount-1)
  const rangeA=useMemo(()=>periodRange(Number(yearA),Number(months),safeSegment),[yearA,months,safeSegment]);const rangeB=useMemo(()=>periodRange(Number(yearB),Number(months),safeSegment),[yearB,months,safeSegment])
  const periodName=months===3?(en?`Q${safeSegment+1}`:`${safeSegment+1}ο τρίμηνο`):months===6?(safeSegment===0?(en?'1st half':'1ο εξάμηνο'):(en?'2nd half':'2ο εξάμηνο')):(en?'Full year':'Έτος')

  const data=useMemo(()=>{
    const sourceAll=[...loadEnvironmentalSamples(),...loadWaterRecords(),...loadStaffSamples()]
    const build=(range)=>{
      const periodSamples=samples.filter(r=>inRange(r,range.start,range.end));const positive=periodSamples.filter(r=>laboratoryStatus(r)==='Θετικό'&&safeText(r.microorganism));const resistant=positive.filter(r=>RESISTANT.has(safeText(r.resistance))||hasCarbapenemResistance(r));const periodInfections=infections.filter(r=>inRange(r,range.start,range.end));const periodIsolations=isolations.filter(r=>inRange(r,range.start,range.end));const incidents=loadIncidents().filter(r=>inRange(r,range.start,range.end));const source=sourceAll.filter(r=>inRange(r,range.start,range.end)&&safeText(r.microorganism));const allMicro=[...positive,...source]
      return{periodSamples,positive,resistant,periodInfections,periodIsolations,incidents,source,allMicro,indicators:loadIndicatorsSnapshot({from:range.from,to:range.to})}
    }
    const a=build(rangeA),b=build(rangeB)
    const regulatory=REGULATORY_GROUPS.map(group=>({id:group.id,label:en?group.en:group.label,a:a.positive.filter(r=>matchesRegulatory(r,group)).length,b:b.positive.filter(r=>matchesRegulatory(r,group)).length}))
    const indicators=[...new Set([...a.indicators.map(x=>x.id||x.name),...b.indicators.map(x=>x.id||x.name)])].map(id=>{const A=a.indicators.find(x=>(x.id||x.name)===id),B=b.indicators.find(x=>(x.id||x.name)===id);return{id,label:A?.name||B?.name||id,unit:A?.unit||B?.unit||'',a:Number(A?.metric?.value??0),b:Number(B?.metric?.value??0),statusA:A?.status?.label||'',statusB:B?.status?.label||''}})
    return{a,b,regulatory,indicators,
      microbes:pairRows(a.allMicro,b.allMicro,r=>r.microorganism||'Χωρίς μικροοργανισμό'),
      departments:pairRows(a.positive,b.positive,r=>r.department||'Χωρίς τμήμα'),
      samplePoints:pairRows(a.allMicro,b.allMicro,pointKey),
      infectionSites:pairRows(a.periodInfections,b.periodInfections,r=>r.infectionType||r.site||r.infectionSite||'Χωρίς κατηγορία'),
      infectionDepartments:pairRows(a.periodInfections,b.periodInfections,r=>r.department||'Χωρίς τμήμα'),
      incidentCategories:pairRows(a.incidents,b.incidents,r=>r.category||'Χωρίς κατηγορία'),
      incidentDepartments:pairRows(a.incidents,b.incidents,r=>r.department||'Χωρίς τμήμα'),
      incidentOutcomes:pairRows(a.incidents,b.incidents,r=>r.outcome||'Χωρίς έκβαση'),
    }
  },[samples,infections,isolations,rangeA.from,rangeA.to,rangeB.from,rangeB.to,en])

  const tabs=[['overview',en?'Overview':'Σύνοψη'],['indicators',en?'Indicators':'Δείκτες'],['microbiology',en?'Microbiology':'Μικροβιολογία'],['infections',en?'Infections':'Λοιμώξεις'],['incidents',en?'Incidents':'Συμβάντα']]
  function exportCsv(){
    const lines=[];const add=(r=[])=>lines.push(r.map(csvCell).join(';'));add([en?'Healthcare Suite — Data analysis':'Healthcare Suite — Ανάλυση δεδομένων']);add([en?'Period':'Περίοδος',periodName,yearA,yearB]);add()
    const section=(title,rows)=>{add([title]);add([en?'Category':'Κατηγορία',yearA,yearB]);rows.forEach(x=>add([x.label,x.a,x.b]));add()}
    section(en?'Regulatory pathogens':'Παθογόνα επιτήρησης',data.regulatory);section(en?'Microorganisms':'Μικροοργανισμοί',data.microbes);section(en?'Specimen / sampling point':'Είδος / σημείο δείγματος',data.samplePoints);section(en?'Positive cultures by department':'Θετικές καλλιέργειες ανά τμήμα',data.departments);section(en?'Infections by site':'Λοιμώξεις ανά εστία',data.infectionSites);section(en?'Incidents by category':'Συμβάντα ανά κατηγορία',data.incidentCategories)
    add([en?'INDICATORS':'ΔΕΙΚΤΕΣ']);add([en?'Indicator':'Δείκτης',yearA,yearB,en?'Unit':'Μονάδα']);data.indicators.forEach(x=>add([x.label,x.a,x.b,x.unit]));
    download(`healthcare-suite-analytics-${yearA}-vs-${yearB}.csv`,'\ufeff'+lines.join('\n'),'text/csv;charset=utf-8;')
  }
  function printReport(){window.print()}

  return <div className="full-report-overlay analytics-fullscreen-overlay"><section className="full-report-panel analytics-hub-panel analytics-fullscreen-panel">
    <header className="full-report-head"><div><span>{en?'DATA ANALYSIS':'ΑΝΑΛΥΣΗ ΔΕΔΟΜΕΝΩΝ'}</span><h2>{en?'Comparative analytics center':'Κέντρο συγκριτικής ανάλυσης'}</h2><p>{en?'One workspace for indicators, microbiology, infections and incidents with year-to-year comparison.':'Ένας χώρος για δείκτες, μικροβιολογία, λοιμώξεις και συμβάντα με σταθερή σύγκριση ετών.'}</p></div><button type="button" className="analytics-back-button" onClick={onClose}><ArrowLeft size={17}/>{en?'Back to Dashboard':'Πίσω στο Dashboard'}</button></header>
    <div className="full-report-toolbar"><div className="full-report-controls"><label>{en?'Period':'Περίοδος'}<select value={months} onChange={e=>{setMonths(Number(e.target.value));setSegment(0)}}><option value={3}>{en?'Quarter':'Τρίμηνο'}</option><option value={6}>{en?'Half-year':'Εξάμηνο'}</option><option value={12}>{en?'Year':'Έτος'}</option></select></label>{months!==12&&<label>{en?'Part':'Υποπερίοδος'}<select value={safeSegment} onChange={e=>setSegment(Number(e.target.value))}>{Array.from({length:segmentCount},(_,i)=><option key={i} value={i}>{months===3?(en?`Q${i+1}`:`${i+1}ο τρίμηνο`):(i===0?(en?'1st half':'1ο εξάμηνο'):(en?'2nd half':'2ο εξάμηνο'))}</option>)}</select></label>}<label>{en?'Year A':'Έτος Α'}<select value={yearA} onChange={e=>setYearA(Number(e.target.value))}>{years.map(y=><option key={y}>{y}</option>)}</select></label><label>{en?'Year B':'Έτος Β'}<select value={yearB} onChange={e=>setYearB(Number(e.target.value))}>{years.map(y=><option key={y}>{y}</option>)}</select></label></div><div className="full-report-actions"><button type="button" onClick={exportCsv}><Download size={15}/>{en?'Export':'Εξαγωγή'}</button><button type="button" onClick={printReport}><Printer size={15}/>{en?'Print / PDF':'Εκτύπωση / PDF'}</button></div></div>
    <nav className="analytics-hub-tabs">{tabs.map(([id,label])=><button type="button" key={id} className={tab===id?'is-active':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    <div className="full-report-scroll analytics-hub-scroll">
      <div className="analytics-year-legend"><span className="a"><i/>{yearA}</span><span className="b"><i/>{yearB}</span><b>{periodName}</b></div>
      {tab==='overview'&&<><div className="analytics-compare-grid"><CompareCard label={en?'Positive cultures':'Θετικές καλλιέργειες'} a={data.a.positive.length} b={data.b.positive.length} yearA={yearA} yearB={yearB}/><CompareCard label={en?'Resistant isolates':'Ανθεκτικές απομονώσεις'} a={data.a.resistant.length} b={data.b.resistant.length} yearA={yearA} yearB={yearB}/><CompareCard label={en?'Infections':'Λοιμώξεις'} a={data.a.periodInfections.length} b={data.b.periodInfections.length} yearA={yearA} yearB={yearB}/><CompareCard label={en?'Incidents':'Συμβάντα'} a={data.a.incidents.length} b={data.b.incidents.length} yearA={yearA} yearB={yearB}/></div><div className="full-report-grid"><ChartSection title={en?'Regulatory pathogens':'Παθογόνα επιτήρησης'}><PairBarList rows={data.regulatory} yearA={yearA} yearB={yearB}/></ChartSection><ChartSection title={en?'Positive cultures by department':'Θετικές καλλιέργειες ανά τμήμα'}><PairBarList rows={data.departments} yearA={yearA} yearB={yearB}/></ChartSection></div></>}
      {tab==='indicators'&&<section className="full-report-section full-report-section--wide"><div className="full-report-title"><h3>{en?'All configured indicators':'Όλοι οι καταχωρημένοι δείκτες'}</h3><span>{data.indicators.length}</span></div><div className="indicator-compare-grid">{data.indicators.map(x=><CompareCard key={x.id} label={`${x.label}${x.unit?` · ${x.unit}`:''}`} a={x.a} b={x.b} yearA={yearA} yearB={yearB}/>)}</div></section>}
      {tab==='microbiology'&&<div className="full-report-grid"><ChartSection title={en?'Microorganisms':'Μικροοργανισμοί'}><PairBarList rows={data.microbes} yearA={yearA} yearB={yearB}/></ChartSection><ChartSection title={en?'Specimen / sampling point':'Είδος / σημείο δείγματος'}><PairBarList rows={data.samplePoints} yearA={yearA} yearB={yearB}/></ChartSection><ChartSection title={en?'Positive cultures by department':'Θετικές καλλιέργειες ανά τμήμα'}><PairBarList rows={data.departments} yearA={yearA} yearB={yearB}/></ChartSection><ChartSection title={en?'Regulatory pathogens':'Παθογόνα επιτήρησης'}><PairBarList rows={data.regulatory} yearA={yearA} yearB={yearB}/></ChartSection></div>}
      {tab==='infections'&&<div className="full-report-grid"><ChartSection title={en?'Infections by category / site':'Λοιμώξεις ανά κατηγορία / εστία'}><PairBarList rows={data.infectionSites} yearA={yearA} yearB={yearB}/></ChartSection><ChartSection title={en?'Infections by department':'Λοιμώξεις ανά τμήμα'}><PairBarList rows={data.infectionDepartments} yearA={yearA} yearB={yearB}/></ChartSection></div>}
      {tab==='incidents'&&<div className="full-report-grid"><ChartSection title={en?'Incidents by category':'Συμβάντα ανά κατηγορία'}><PairBarList rows={data.incidentCategories} yearA={yearA} yearB={yearB}/></ChartSection><ChartSection title={en?'Incidents by department':'Συμβάντα ανά τμήμα'}><PairBarList rows={data.incidentDepartments} yearA={yearA} yearB={yearB}/></ChartSection><ChartSection title={en?'Incidents by outcome':'Συμβάντα ανά έκβαση'}><PairBarList rows={data.incidentOutcomes} yearA={yearA} yearB={yearB}/></ChartSection></div>}
    </div>
  </section></div>
}
function ChartSection({title,children}){return <section className="full-report-section"><div className="full-report-title"><h3>{title}</h3></div>{children}</section>}

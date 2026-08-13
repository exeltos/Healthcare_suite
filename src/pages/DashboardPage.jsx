import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Biohazard,
  BrainCircuit,
  BarChart3,
  Download,
  Printer,
  X,
  ClipboardPlus,
  Clock3,
  FlaskConical,
  Plus,
  ShieldAlert,
  TestTube2,
  Users,
} from 'lucide-react'

import { APP_ROUTES } from '../config/routes'
import { APP_EVENTS, useAppEvents } from '../core/events'
import { useI18n } from '../i18n/I18nProvider'
import { Button, Card, PageChrome, PageHeader, StatCard } from '../components/core'
import { limoxisApi } from '../api'
import { PATIENT_SAMPLES_EVENT } from '../services/patientSamplesService'
import { INFECTIONS_EVENT } from '../services/infectionsService'
import { ISOLATIONS_EVENT } from '../services/isolationsService'
import { INDICATORS_EVENT } from '../services/indicatorsService'
import { LABORATORY_RESISTANT_MARKERS, laboratoryStatus } from '../core/constants/laboratory'

import FullReportPanel from '../components/analytics/FullReportPanel'

import './DashboardPage.css'

const resistantValues = LABORATORY_RESISTANT_MARKERS

export default function DashboardPage() {
  const { language, t } = useI18n()
  const { openNewEntryLauncher } = useOutletContext()
  const initialSnapshot = useMemo(() => limoxisApi.dashboard.snapshot(), [])
  const [patients, setPatients] = useState(initialSnapshot.patients)
  const [samples, setSamples] = useState(initialSnapshot.samples)
  const [infections, setInfections] = useState(initialSnapshot.infections)
  const [isolations, setIsolations] = useState(initialSnapshot.isolations)
  const [indicators, setIndicators] = useState(initialSnapshot.indicators)
  const [analyticsOpen,setAnalyticsOpen]=useState(false)

  useAppEvents([
    PATIENT_SAMPLES_EVENT,
    INFECTIONS_EVENT,
    ISOLATIONS_EVENT,
    INDICATORS_EVENT,
    APP_EVENTS.HAND_HYGIENE_UPDATED,
    APP_EVENTS.STAFF_VACCINATIONS_UPDATED,
  ], () => {
    const snapshot = limoxisApi.dashboard.snapshot()
    setPatients(snapshot.patients)
    setSamples(snapshot.samples)
    setInfections(snapshot.infections)
    setIsolations(snapshot.isolations)
    setIndicators(snapshot.indicators)
  }, { includeStorage: true })

  const stats = useMemo(() => {
    const admittedPatients = patients.filter((patient) => patient.status === 'Νοσηλεύεται')
    const admitted = admittedPatients.length
    const admittedIds = new Set(admittedPatients.map((patient) => String(patient.id)))
    const currentSamples = samples.filter((sample) => !sample.patientId || admittedIds.has(String(sample.patientId)))
    const pendingSamples = currentSamples.filter((sample) => laboratoryStatus(sample) === 'Εκκρεμεί').length
    const positiveSamples = currentSamples.filter((sample) => laboratoryStatus(sample) === 'Θετικό').length
    const resistantSamples = currentSamples.filter((sample) => resistantValues.has(sample.resistance)).length
    const activeInfections = infections.filter((infection) => infection.status !== 'Ολοκληρωμένη').length
    const activeIsolations = isolations.filter((isolation) => isolation.status === 'Ενεργή').length

    return { admitted, pendingSamples, positiveSamples, resistantSamples, activeInfections, activeIsolations }
  }, [patients, samples, infections, isolations])

  const priorities = useMemo(() => {
    const rows = []

    if (stats.resistantSamples > 0) {
      rows.push({
        id: 'resistant', tone: 'danger', icon: Biohazard,
        title: t('dashboard.priority.resistantTitle').replace('{count}', stats.resistantSamples),
        description: t('dashboard.priority.resistantText'),
        path: `${APP_ROUTES.LABORATORY}?attention=resistant`,
      })
    }
    if (stats.pendingSamples > 0) {
      rows.push({
        id: 'pending', tone: 'warning', icon: Clock3,
        title: t('dashboard.priority.pendingTitle').replace('{count}', stats.pendingSamples),
        description: t('dashboard.priority.pendingText'),
        path: `${APP_ROUTES.LABORATORY}?status=${encodeURIComponent('Εκκρεμεί')}`,
      })
    }
    if (stats.activeInfections > 0) {
      rows.push({
        id: 'infections', tone: 'danger', icon: ShieldAlert,
        title: t('dashboard.priority.infectionsTitle').replace('{count}', stats.activeInfections),
        description: t('dashboard.priority.infectionsText'),
        path: `${APP_ROUTES.INFECTIONS}?status=active`,
      })
    }
    if (stats.activeIsolations > 0) {
      rows.push({
        id: 'isolations', tone: 'info', icon: AlertTriangle,
        title: t('dashboard.priority.isolationsTitle').replace('{count}', stats.activeIsolations),
        description: t('dashboard.priority.isolationsText'),
        path: `${APP_ROUTES.ISOLATIONS}?status=${encodeURIComponent('Ενεργή')}`,
      })
    }
    return rows.slice(0, 5)
  }, [stats, t])

  const recentActivity = useMemo(() => {
    const items = [
      ...samples.map((sample) => ({
        id: `sample-${sample.id}`,
        date: sample.resultDate || sample.collectionDate,
        type: t('dashboard.activity.sample'),
        title: sample.microorganism
          ? `${sample.microorganism} · ${sample.status}`
          : `${sample.sampleType || t('dashboard.activity.sample')} · ${sample.status}`,
        description: [sample.patientName, sample.department, sample.resistance].filter(Boolean).join(' · '),
      })),
      ...infections.map((infection) => ({
        id: `infection-${infection.id}`,
        date: infection.infectionDate || infection.onsetDate || infection.createdAt,
        type: t('dashboard.activity.infection'),
        title: infection.infectionType || infection.type || t('dashboard.activity.infectionEntry'),
        description: [infection.patientName, infection.microorganism, infection.status].filter(Boolean).join(' · '),
      })),
      ...isolations.map((isolation) => ({
        id: `isolation-${isolation.id}`,
        date: isolation.startDate || isolation.createdAt,
        type: t('dashboard.activity.isolation'),
        title: isolation.isolationType || t('dashboard.activity.isolation'),
        description: [isolation.patientName, isolation.department, isolation.status].filter(Boolean).join(' · '),
      })),
    ]

    return items
      .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
      .slice(0, 7)
  }, [samples, infections, isolations, t])

  const topDepartments = useMemo(() => {
    const counts = {}
    samples.forEach((sample) => {
      const department = sample.department || t('dashboard.noDepartment')
      counts[department] = counts[department] || { total: 0, positive: 0, resistant: 0 }
      counts[department].total += 1
      if (laboratoryStatus(sample) === 'Θετικό') counts[department].positive += 1
      if (resistantValues.has(sample.resistance)) counts[department].resistant += 1
    })
    return Object.entries(counts)
      .map(([department, values]) => ({ department, ...values }))
      .sort((a, b) => b.resistant - a.resistant || b.positive - a.positive || b.total - a.total)
      .slice(0, 5)
  }, [samples, t])

  const indicatorSummary = useMemo(() => ({
    available: indicators.filter((item) => item.metric?.value != null).length,
    attention: indicators.filter((item) => item.status?.tone === 'danger' || item.status?.label === 'Χρειάζονται δεδομένα').length,
  }), [indicators])

  const locale = language === 'en' ? 'en-GB' : 'el-GR'
  const todayLabel = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

  const aiText = stats.resistantSamples > 0
    ? t('dashboard.ai.resistant').replace('{count}', stats.resistantSamples)
    : stats.positiveSamples > 0
      ? t('dashboard.ai.positive').replace('{count}', stats.positiveSamples)
      : t('dashboard.ai.clear')

  return (
    <PageChrome
      className="dashboard-page"
      header={<PageHeader
        title={t('dashboard.title')}
        description={todayLabel}
        actions={<div className="dashboard-header-actions"><Button variant="secondary" icon={<BarChart3 size={17}/>} onClick={()=>setAnalyticsOpen(true)}>{language==='en'?'Data analysis':'Ανάλυση δεδομένων'}</Button><Button icon={<Plus size={17} />} onClick={() => openNewEntryLauncher()}>{t('dashboard.newEntry')}</Button></div>}
      />}
    >
      <div className="dashboard-kpis" aria-label={t('dashboard.kpiAria')}>
        <StatCard icon={BedDouble} label={t('dashboard.kpi.admitted')} value={stats.admitted} />
        <StatCard icon={Clock3} label={t('dashboard.kpi.pendingSamples')} value={stats.pendingSamples} tone="warning" />
        <StatCard icon={TestTube2} label={t('dashboard.kpi.positiveResults')} value={stats.positiveSamples} tone="danger" />
        <StatCard icon={Biohazard} label="MDR / XDR" value={stats.resistantSamples} tone="danger" />
        <StatCard icon={ShieldAlert} label={t('dashboard.kpi.activeInfections')} value={stats.activeInfections} tone="warning" />
        <StatCard icon={Activity} label={t('dashboard.kpi.isolations')} value={stats.activeIsolations} tone="info" />
      </div>

      <div className="dashboard-layout">
        <main className="dashboard-main-column">
          <Card className="dashboard-panel dashboard-priorities-panel">
            <PanelTitle title={t('dashboard.attention')} actionLabel={t('dashboard.openLaboratory')} actionPath={APP_ROUTES.LABORATORY} />
            <div className="dashboard-priority-list">
              {priorities.length > 0 ? priorities.map((item) => {
                const Icon = item.icon
                return <Link key={item.id} to={item.path} className={`dashboard-priority ${item.tone}`}>
                  <span className="dashboard-priority-icon"><Icon size={17} /></span>
                  <span className="dashboard-priority-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
                  <ArrowRight size={16} />
                </Link>
              }) : <EmptyState text={t('dashboard.noUrgent')} />}
            </div>
          </Card>

          <Card className="dashboard-panel">
            <PanelTitle title={t('dashboard.departmentsTitle')} actionLabel={t('dashboard.allResults')} actionPath={APP_ROUTES.LABORATORY} />
            <div className="dashboard-table" role="table" aria-label={t('dashboard.departmentsAria')}>
              <div className="dashboard-table-row dashboard-table-head" role="row">
                <span>{t('dashboard.table.department')}</span><span>{t('dashboard.table.total')}</span><span>{t('dashboard.table.positive')}</span><span>MDR/XDR</span>
              </div>
              {topDepartments.map((item) => <div className="dashboard-table-row" role="row" key={item.department}>
                <strong>{item.department}</strong><span>{item.total}</span><span>{item.positive}</span><span>{item.resistant}</span>
              </div>)}
              {topDepartments.length === 0 && <EmptyState text={t('dashboard.noDepartmentData')} />}
            </div>
          </Card>

          <Card className="dashboard-panel dashboard-ai-panel">
            <div className="dashboard-ai-icon"><BrainCircuit size={19} /></div>
            <div>
              <div className="dashboard-ai-heading"><h2>LIRA AI</h2><Link to={APP_ROUTES.LIRA}>{t('dashboard.openAi')} <ArrowRight size={14} /></Link></div>
              <p>{aiText}</p>
              <small className="dashboard-ai-note">{t('dashboard.ai.note')}</small>
            </div>
          </Card>
        </main>

        <aside className="dashboard-side-column">
          <Card className="dashboard-panel">
            <PanelTitle title={t('dashboard.quickActions')} />
            <div className="dashboard-quick-actions">
              <QuickAction icon={Users} label={t('dashboard.quick.patients')} path={APP_ROUTES.PATIENTS} />
              <QuickAction icon={FlaskConical} label={t('dashboard.quick.laboratory')} path={APP_ROUTES.LABORATORY} />
              <QuickAction icon={ClipboardPlus} label={t('dashboard.quick.infections')} path={APP_ROUTES.INFECTIONS} />
              <QuickAction icon={Activity} label={t('dashboard.quick.indicators')} path={APP_ROUTES.INDICATORS} />
            </div>
          </Card>

          <Card className="dashboard-panel">
            <PanelTitle title={t('dashboard.indicators')} actionLabel={t('dashboard.viewAll')} actionPath={APP_ROUTES.INDICATORS} />
            <div className="dashboard-summary-list" aria-label={t('dashboard.indicatorsAria')}>
              <div><strong>{t('dashboard.indicator.available')}</strong><span>{indicatorSummary.available}</span></div>
              <div><strong>{t('dashboard.indicator.attention')}</strong><span>{indicatorSummary.attention}</span></div>
            </div>
          </Card>

          <Card className="dashboard-panel">
            <PanelTitle title={t('dashboard.recentActivity')} />
            <div className="dashboard-activity-list">
              {recentActivity.map((item) => <article key={item.id} className="dashboard-activity-item">
                <span className="dashboard-activity-marker" />
                <div><div className="dashboard-activity-topline"><strong>{item.title}</strong><time>{formatActivityDate(item.date, locale)}</time></div><p>{item.description || item.type}</p></div>
              </article>)}
              {recentActivity.length === 0 && <EmptyState text={t('dashboard.noRecentActivity')} />}
            </div>
          </Card>
        </aside>
      </div>
      {analyticsOpen&&<FullReportPanel samples={samples} infections={infections} isolations={isolations} language={language} onClose={()=>setAnalyticsOpen(false)}/>}
    </PageChrome>
  )
}

function PanelTitle({ title, actionLabel, actionPath }) {
  return <header className="dashboard-panel-title"><h2>{title}</h2>{actionLabel && actionPath && <Link to={actionPath}>{actionLabel}<ArrowRight size={14} /></Link>}</header>
}

function QuickAction({ icon: Icon, label, path }) {
  return <Link to={path} className="dashboard-quick-action"><Icon size={16} /><span>{label}</span><ArrowRight size={14} /></Link>
}

function EmptyState({ text }) { return <div className="dashboard-empty">{text}</div> }

function parseDate(value) {
  if (!value) return new Date(0)
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return new Date(value)
  const [day, month, year] = String(value).split('/')
  if (!year) return new Date(0)
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`)
}

function formatActivityDate(value, locale) {
  const date = parseDate(value)
  if (!value || date.getTime() === 0 || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(date)
}

function AnalyticsPanel({samples,infections,isolations,months,setMonths,metric,setMetric,language,onClose}){
  const en=language==='en'
  const now=new Date()
  const defs={
    positive:{el:'Θετικές καλλιέργειες',en:'Positive cultures'},
    resistant:{el:'MDR / XDR',en:'MDR / XDR'},
    infections:{el:'Καταγεγραμμένες λοιμώξεις',en:'Recorded infections'},
    isolations:{el:'Απομονώσεις',en:'Isolations'},
  }
  const dateOf=x=>parseDate(x.resultDate||x.collectionDate||x.infectionDate||x.onsetDate||x.startDate||x.createdAt)
  const source=metric==='infections'?infections:metric==='isolations'?isolations:samples.filter(x=>metric==='resistant'?resistantValues.has(x.resistance):laboratoryStatus(x)==='Θετικό')
  const years=useMemo(()=>{
    const found=new Set([now.getFullYear(),now.getFullYear()-1])
    ;[...samples,...infections,...isolations].forEach(item=>{const d=dateOf(item);if(!Number.isNaN(d.getTime())&&d.getFullYear()>2000)found.add(d.getFullYear())})
    return [...found].sort((a,b)=>b-a)
  },[samples,infections,isolations])
  const [yearA,setYearA]=useState(years[0]||now.getFullYear())
  const [yearB,setYearB]=useState(years.find(y=>y!==yearA)||yearA-1)
  const [segment,setSegment]=useState(0)
  const [exportOpen,setExportOpen]=useState(false)

  const segmentCount=months===3?4:months===6?2:1
  const safeSegment=Math.min(segment,segmentCount-1)
  const startMonth=months===12?0:safeSegment*months
  const locale=en?'en-GB':'el-GR'
  const periodName=months===3
    ? (en?`Q${safeSegment+1}`:`${safeSegment+1}ο τρίμηνο`)
    : months===6
      ? (safeSegment===0?(en?'1st half':'1ο εξάμηνο'):(en?'2nd half':'2ο εξάμηνο'))
      : (en?'Full year':'Έτος')

  const valuesForYear=year=>Array.from({length:months},(_,index)=>{
    const month=startMonth+index
    const d=new Date(year,month,1)
    return {
      month,
      label:new Intl.DateTimeFormat(locale,{month:'short'}).format(d),
      value:source.filter(item=>{const q=dateOf(item);return q.getFullYear()===year&&q.getMonth()===month}).length,
    }
  })
  const seriesA=valuesForYear(Number(yearA)),seriesB=valuesForYear(Number(yearB))
  const totalA=seriesA.reduce((sum,item)=>sum+item.value,0),totalB=seriesB.reduce((sum,item)=>sum+item.value,0)
  const change=totalB?Math.round((totalA-totalB)/totalB*100):(totalA===0?0:null)
  const max=Math.max(1,...seriesA.map(x=>x.value),...seriesB.map(x=>x.value))
  const metricName=defs[metric][en?'en':'el']

  function exportCsv(){
    const rows=[
      [en?'Metric':'Δείκτης',metricName],
      [en?'Period':'Περίοδος',periodName],
      [],
      [en?'Month':'Μήνας',String(yearA),String(yearB)],
      ...seriesA.map((item,index)=>[item.label,String(item.value),String(seriesB[index]?.value??0)]),
      [en?'Total':'Σύνολο',String(totalA),String(totalB)],
    ]
    const csv='\ufeff'+rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(';')).join('\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob),a=document.createElement('a')
    a.href=url;a.download=`healthcare-suite-${metric}-${yearA}-${yearB}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);setExportOpen(false)
  }

  function printReport(){
    const popup=window.open('','_blank','width=980,height=760')
    if(!popup)return
    const rows=seriesA.map((item,index)=>`<tr><td>${item.label}</td><td>${item.value}</td><td>${seriesB[index]?.value??0}</td></tr>`).join('')
    popup.document.write(`<!doctype html><html><head><title>${metricName}</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#17323a}h1{font-size:22px;margin:0 0 6px}p{color:#60757c;margin:0 0 22px}.legend{display:flex;gap:18px;margin:16px 0}.legend span:before{content:'';display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}.a:before{background:#0b7b84}.b:before{background:#6673c7}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{padding:10px;border:1px solid #dce6e9;text-align:left}th{background:#f4f8f9}.total{font-weight:700}</style></head><body><h1>${metricName}</h1><p>${periodName} · ${yearA} vs ${yearB}</p><div class="legend"><span class="a">${yearA}</span><span class="b">${yearB}</span></div><table><thead><tr><th>${en?'Month':'Μήνας'}</th><th>${yearA}</th><th>${yearB}</th></tr></thead><tbody>${rows}<tr class="total"><td>${en?'Total':'Σύνολο'}</td><td>${totalA}</td><td>${totalB}</td></tr></tbody></table></body></html>`)
    popup.document.close();popup.focus();setTimeout(()=>popup.print(),150);setExportOpen(false)
  }

  return <div className="analytics-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="analytics-panel">
    <header><div><span>{en?'DASHBOARD ANALYTICS':'ΑΝΑΛΥΣΗ DASHBOARD'}</span><h2>{en?'Year-to-year comparative analysis':'Συγκριτική ανάλυση ανά έτος'}</h2><p>{en?'Compare the same quarter, half-year or full year side by side.':'Σύγκρινε δίπλα-δίπλα την ίδια περίοδο δύο διαφορετικών ετών.'}</p></div><button type="button" className="icon-button" onClick={onClose}><X size={19}/></button></header>
    <div className="analytics-toolbar">
      <div className="analytics-controls">
        <label>{en?'Metric':'Δείκτης'}<select value={metric} onChange={e=>setMetric(e.target.value)}>{Object.entries(defs).map(([k,v])=><option value={k} key={k}>{v[en?'en':'el']}</option>)}</select></label>
        <label>{en?'Period':'Περίοδος'}<select value={months} onChange={e=>{setMonths(Number(e.target.value));setSegment(0)}}><option value={3}>{en?'Quarter':'Τρίμηνο'}</option><option value={6}>{en?'Half-year':'Εξάμηνο'}</option><option value={12}>{en?'Year':'Έτος'}</option></select></label>
        {months!==12&&<label>{en?'Part':'Υποπερίοδος'}<select value={safeSegment} onChange={e=>setSegment(Number(e.target.value))}>{Array.from({length:segmentCount},(_,i)=><option value={i} key={i}>{months===3?(en?`Q${i+1}`:`${i+1}ο τρίμηνο`):(i===0?(en?'1st half':'1ο εξάμηνο'):(en?'2nd half':'2ο εξάμηνο'))}</option>)}</select></label>}
        <label>{en?'Year A':'Έτος Α'}<select value={yearA} onChange={e=>setYearA(Number(e.target.value))}>{years.map(y=><option value={y} key={`a-${y}`}>{y}</option>)}</select></label>
        <label>{en?'Year B':'Έτος Β'}<select value={yearB} onChange={e=>setYearB(Number(e.target.value))}>{years.map(y=><option value={y} key={`b-${y}`}>{y}</option>)}</select></label>
      </div>
      <div className="analytics-export-wrap"><button type="button" className="analytics-export-button" onClick={()=>setExportOpen(v=>!v)}><Download size={15}/>{en?'Export':'Εξαγωγή'}</button>{exportOpen&&<div className="analytics-export-menu"><button type="button" onClick={exportCsv}><Download size={14}/>CSV</button><button type="button" onClick={printReport}><Printer size={14}/>{en?'Print / PDF':'Εκτύπωση / PDF'}</button></div>}</div>
    </div>
    <div className="analytics-legend"><span className="series-a"><i/>{yearA}</span><span className="series-b"><i/>{yearB}</span><b>{periodName}</b></div>
    <div className="analytics-summary analytics-summary--compare"><div className="summary-a"><small>{yearA}</small><strong>{totalA}</strong></div><div className="summary-b"><small>{yearB}</small><strong>{totalB}</strong></div><div><small>{en?'Difference A vs B':'Μεταβολή Α έναντι Β'}</small><strong className={change>0?'is-up':change<0?'is-down':''}>{change===null?'—':`${change>0?'+':''}${change}%`}</strong></div></div>
    <div className="analytics-chart analytics-chart--compare">{seriesA.map((item,index)=>{const other=seriesB[index]||{value:0};return <div className="analytics-bar-group" key={`${item.month}-${yearA}-${yearB}`}><div className="analytics-pair"><div className="analytics-bar-wrap"><span>{item.value}</span><div className="analytics-bar series-a" style={{height:`${Math.max(4,item.value/max*100)}%`}}/></div><div className="analytics-bar-wrap"><span>{other.value}</span><div className="analytics-bar series-b" style={{height:`${Math.max(4,other.value/max*100)}%`}}/></div></div><small>{item.label}</small></div>})}</div>
    <div className="analytics-insight"><strong>{en?'Comparison summary':'Σύνοψη σύγκρισης'}</strong><p>{change===null?(en?'The comparison year has no recorded values for this period, so a percentage change is not shown.':'Το έτος σύγκρισης δεν έχει καταχωρημένες τιμές για αυτή την περίοδο, επομένως δεν εμφανίζεται ποσοστιαία μεταβολή.'):(change>0?(en?`${yearA} is ${Math.abs(change)}% higher than ${yearB} for the selected period.`:`Το ${yearA} είναι κατά ${Math.abs(change)}% υψηλότερο από το ${yearB} για την επιλεγμένη περίοδο.`):(change<0?(en?`${yearA} is ${Math.abs(change)}% lower than ${yearB} for the selected period.`:`Το ${yearA} είναι κατά ${Math.abs(change)}% χαμηλότερο από το ${yearB} για την επιλεγμένη περίοδο.`):(en?'Both years have the same total for the selected period.':'Τα δύο έτη έχουν το ίδιο σύνολο για την επιλεγμένη περίοδο.')))}</p><small>{en?'Descriptive analytics only; values depend on recorded data.':'Περιγραφική ανάλυση μόνο· οι τιμές εξαρτώνται από τα καταχωρημένα δεδομένα.'}</small></div>
  </section></div>
}


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
  const [analyticsMonths,setAnalyticsMonths]=useState(6)
  const [analyticsMetric,setAnalyticsMetric]=useState('positive')

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
      {analyticsOpen&&<AnalyticsPanel samples={samples} infections={infections} isolations={isolations} months={analyticsMonths} setMonths={setAnalyticsMonths} metric={analyticsMetric} setMetric={setAnalyticsMetric} language={language} onClose={()=>setAnalyticsOpen(false)}/>}
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
  const en=language==='en', now=new Date();
  const defs={positive:{el:'Θετικές καλλιέργειες',en:'Positive cultures'},resistant:{el:'MDR / XDR',en:'MDR / XDR'},infections:{el:'Ενεργές/καταγεγραμμένες λοιμώξεις',en:'Recorded infections'},isolations:{el:'Απομονώσεις',en:'Isolations'}};
  const dateOf=x=>parseDate(x.resultDate||x.collectionDate||x.infectionDate||x.onsetDate||x.startDate||x.createdAt);
  const source=metric==='infections'?infections:metric==='isolations'?isolations:samples.filter(x=>metric==='resistant'?resistantValues.has(x.resistance):laboratoryStatus(x)==='Θετικό');
  const buckets=Array.from({length:months},(_,i)=>{const d=new Date(now.getFullYear(),now.getMonth()-(months-1-i),1), y=d.getFullYear(),m=d.getMonth();return {d,label:new Intl.DateTimeFormat(en?'en-GB':'el-GR',{month:'short'}).format(d),value:source.filter(x=>{const q=dateOf(x);return q.getFullYear()===y&&q.getMonth()===m}).length}});
  const previous=source.filter(x=>{const d=dateOf(x),end=new Date(now.getFullYear(),now.getMonth()-months+1,1),start=new Date(end.getFullYear(),end.getMonth()-months,1);return d>=start&&d<end}).length,current=buckets.reduce((a,b)=>a+b.value,0),change=previous?Math.round((current-previous)/previous*100):null,max=Math.max(1,...buckets.map(x=>x.value));
  return <div className="analytics-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="analytics-panel"><header><div><span>{en?'DASHBOARD ANALYTICS':'ΑΝΑΛΥΣΗ DASHBOARD'}</span><h2>{en?'Comparative analysis':'Συγκριτική ανάλυση'}</h2><p>{en?'Current period compared with the immediately preceding equivalent period.':'Η τρέχουσα περίοδος συγκρίνεται με την αμέσως προηγούμενη ισόχρονη περίοδο.'}</p></div><button type="button" className="icon-button" onClick={onClose}><X size={19}/></button></header><div className="analytics-controls"><label>{en?'Metric':'Δείκτης'}<select value={metric} onChange={e=>setMetric(e.target.value)}>{Object.entries(defs).map(([k,v])=><option value={k} key={k}>{v[en?'en':'el']}</option>)}</select></label><label>{en?'Period':'Περίοδος'}<select value={months} onChange={e=>setMonths(Number(e.target.value))}><option value={6}>{en?'6 months':'6 μήνες'}</option><option value={12}>{en?'12 months':'12 μήνες'}</option></select></label></div><div className="analytics-summary"><div><small>{en?'Current period':'Τρέχουσα περίοδος'}</small><strong>{current}</strong></div><div><small>{en?'Previous period':'Προηγούμενη περίοδος'}</small><strong>{previous}</strong></div><div><small>{en?'Change':'Μεταβολή'}</small><strong>{change===null?'—':`${change>0?'+':''}${change}%`}</strong></div></div><div className="analytics-chart">{buckets.map(b=><div className="analytics-bar-col" key={b.d.toISOString()} title={`${b.label}: ${b.value}`}><span>{b.value}</span><div className="analytics-bar" style={{height:`${Math.max(5,b.value/max*100)}%`}}/><small>{b.label}</small></div>)}</div><div className="analytics-insight"><strong>{en?'Period summary':'Σύνοψη περιόδου'}</strong><p>{change===null?(en?'There are not enough data in the previous period for a reliable percentage comparison.':'Δεν υπάρχουν αρκετά δεδομένα στην προηγούμενη περίοδο για αξιόπιστη ποσοστιαία σύγκριση.'):(change>0?(en?`The selected metric increased by ${Math.abs(change)}% compared with the previous period.`:`Ο επιλεγμένος δείκτης αυξήθηκε κατά ${Math.abs(change)}% σε σχέση με την προηγούμενη περίοδο.`):(change<0?(en?`The selected metric decreased by ${Math.abs(change)}% compared with the previous period.`:`Ο επιλεγμένος δείκτης μειώθηκε κατά ${Math.abs(change)}% σε σχέση με την προηγούμενη περίοδο.`):(en?'The selected metric is unchanged from the previous period.':'Ο επιλεγμένος δείκτης παραμένει αμετάβλητος σε σχέση με την προηγούμενη περίοδο.')))}</p><small>{en?'Descriptive analytics only; values depend on recorded data.':'Περιγραφική ανάλυση μόνο· οι τιμές εξαρτώνται από τα καταχωρημένα δεδομένα.'}</small></div></section></div>
}

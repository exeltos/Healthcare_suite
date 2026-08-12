import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  ClipboardCheck,
  Droplets,
  Hand,
  PackageCheck,
  Plus,
  Recycle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import {
  HAND_HYGIENE_EVENT,
  loadHandHygieneSessions,
} from '../../services/preventionService'
import {
  ANTISEPTIC_CONSUMPTION_EVENT,
  loadAntisepticConsumption,
} from '../../services/preventionService'
import {
  WASTE_MEASUREMENTS_EVENT,
  loadWasteMeasurements,
} from '../../services/preventionService'
import {
  PREVENTION_AUDITS_EVENT,
  loadPreventionAudits,
} from '../../services/preventionService'
import { BUNDLES_EVENT, loadBundles } from '../../services/preventionService'
import { FORM_TEMPLATES_EVENT, loadFormTemplates } from '../../services/formTemplatesService'
import { FORM_RESPONSES_EVENT, loadFormResponses } from '../../services/formResponsesService'
import StatCard from '../../components/core/StatCard/StatCard'
import './PreventionCenterPage.css'

const EVENTS = [
  HAND_HYGIENE_EVENT,
  ANTISEPTIC_CONSUMPTION_EVENT,
  WASTE_MEASUREMENTS_EVENT,
  PREVENTION_AUDITS_EVENT,
  BUNDLES_EVENT,
  FORM_TEMPLATES_EVENT,
  FORM_RESPONSES_EVENT,
]

const MODULES = [
  {
    id: 'hand-hygiene',
    title: 'Υγιεινή Χεριών',
    description: 'Παρατηρήσεις WHO και συμμόρφωση.',
    icon: Hand,
    path: '/prevention/hand-hygiene',
  },
  {
    id: 'antiseptics',
    title: 'Κατανάλωση Αντισηπτικών',
    description: 'Κατανάλωση και δείκτες ανά τμήμα.',
    icon: PackageCheck,
    path: '/prevention/antiseptic-consumption',
  },
  {
    id: 'waste',
    title: 'Μετρήσεις Αποβλήτων',
    description: 'Βάρος, κατηγορίες και δείκτες.',
    icon: Recycle,
    path: '/prevention/waste',
  },
  {
    id: 'bundles',
    title: 'Bundles & Checklists',
    description: 'Έτοιμα και προσαρμοσμένα ερωτηματολόγια.',
    icon: BadgeCheck,
    path: '/prevention/bundles',
  },
]

export default function PreventionCenterPage() {
  const navigate = useNavigate()
  const [version, setVersion] = useState(0)

  useAppEvents(EVENTS, () => setVersion((current) => current + 1), { includeStorage: true })

  const data = useMemo(() => {
    const handHygiene = loadHandHygieneSessions()
    const antiseptics = loadAntisepticConsumption()
    const waste = loadWasteMeasurements()
    const audits = loadPreventionAudits()
    const bundles = loadBundles()
    const formTemplates = loadFormTemplates()
    const formResponses = loadFormResponses()
    return { handHygiene, antiseptics, waste, audits, bundles, formTemplates, formResponses }
  }, [version])

  const metrics = useMemo(() => calculateMetrics(data), [data])
  const recentItems = useMemo(() => buildRecentItems(data), [data])
  const activity = useMemo(() => buildMonthlyActivity(data), [data])

  return (
    <section className="prevention-overview">
      <header className="prevention-overview__header">
        <div>
          <span>Πρόληψη & Συμμόρφωση</span>
          <h1>Επισκόπηση Πρόληψης</h1>
          <p>Ενιαία εικόνα συμμόρφωσης, καταναλώσεων και δυναμικών bundles & checklists.</p>
        </div>
        <button type="button" onClick={() => navigate('/prevention/hand-hygiene')}>
          <Plus size={18} /> Νέα καταχώρηση
        </button>
      </header>

      <div className="prevention-overview__kpis">
        <StatCard
          icon={Hand}
          label="Συμμόρφωση χεριών"
          value={metrics.handCompliance == null ? '—' : `${formatNumber(metrics.handCompliance, 1)}%`}
          subtitle={`${metrics.handObservations} παρατηρήσεις`}
          tone={scoreTone(metrics.handCompliance)}
        />
        <StatCard
          icon={Droplets}
          label="Κατανάλωση αντισηπτικού"
          value={`${formatNumber(metrics.antisepticLitres, 2)} L`}
          subtitle={`${data.antiseptics.length} μετρήσεις`}
        />
        <StatCard
          icon={Recycle}
          label="Συνολικά απόβλητα"
          value={`${formatNumber(metrics.wasteKg, 1)} kg`}
          subtitle={`${formatNumber(metrics.hazardousWastePercent, 1)}% επικίνδυνα`}
        />
        <StatCard
          icon={Target}
          label="Συμμόρφωση bundles"
          value={metrics.bundleCompliance == null ? '—' : `${formatNumber(metrics.bundleCompliance, 1)}%`}
          subtitle={`${data.bundles.length} καταχωρήσεις`}
          tone={scoreTone(metrics.bundleCompliance)}
        />
      </div>

      <div className="prevention-overview__status-row">
        <StatusCard
          icon={<BadgeCheck size={20} />}
          title="Ενεργά πρότυπα"
          value={data.formTemplates.filter((item) => item.status === 'active').length}
          description="Bundles, checklists και ερωτηματολόγια διαθέσιμα για χρήση."
          action="Άνοιγμα βιβλιοθήκης"
          onClick={() => navigate('/prevention/bundles')}
        />
        <StatusCard
          icon={<ClipboardCheck size={20} />}
          title="Εκτελέσεις φορμών"
          value={data.formResponses.length + data.bundles.length}
          description="Συμπληρωμένα δυναμικά και παλαιότερα bundles."
          action="Προβολή εκτελέσεων"
          onClick={() => navigate('/prevention/bundles')}
        />
        <StatusCard
          icon={<ShieldCheck size={20} />}
          title="Προσαρμοσμένες φόρμες"
          value={data.formTemplates.filter((item) => !String(item.id).startsWith('TPL-')).length}
          description="Φόρμες που δημιουργήθηκαν από το νοσοκομείο χωρίς νέο κώδικα."
          action="Form Designer"
          onClick={() => navigate('/forms/designer')}
        />
      </div>

      <div className="prevention-overview__main-grid">
        <article className="prevention-panel prevention-panel--activity">
          <div className="prevention-panel__heading">
            <div>
              <span>Δραστηριότητα</span>
              <h2>Καταχωρήσεις τελευταίων 6 μηνών</h2>
            </div>
            <TrendingUp size={22} />
          </div>
          <div className="prevention-activity-chart" aria-label="Καταχωρήσεις ανά μήνα">
            {activity.map((item) => (
              <div className="prevention-activity-chart__column" key={item.key}>
                <div className="prevention-activity-chart__value">{item.value}</div>
                <div className="prevention-activity-chart__track">
                  <span style={{ height: `${Math.max(4, item.height)}%` }} />
                </div>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
          <div className="prevention-activity-chart__legend">
            <BarChart3 size={17} /> Συνολική δραστηριότητα όλων των ενοτήτων πρόληψης
          </div>
        </article>

        <article className="prevention-panel prevention-panel--attention">
          <div className="prevention-panel__heading">
            <div>
              <span>Προτεραιότητες</span>
              <h2>Τι χρειάζεται προσοχή</h2>
            </div>
            <Sparkles size={22} />
          </div>
          <div className="prevention-attention-list">
            {buildAttentionItems(metrics, data).map((item) => (
              <button key={item.id} type="button" onClick={() => navigate(item.path)}>
                <span className={`prevention-attention-list__dot prevention-attention-list__dot--${item.tone}`} />
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.description}</small>
                </div>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        </article>
      </div>

      <article className="prevention-panel prevention-panel--modules">
        <div className="prevention-panel__heading">
          <div>
            <span>Γρήγορη πρόσβαση</span>
            <h2>Ενότητες πρόληψης</h2>
          </div>
        </div>
        <div className="prevention-modules-grid">
          {MODULES.map((module) => {
            const Icon = module.icon
            const count = moduleCount(module.id, data)
            return (
              <button key={module.id} type="button" onClick={() => navigate(module.path)}>
                <span className="prevention-modules-grid__icon"><Icon size={21} /></span>
                <div>
                  <strong>{module.title}</strong>
                  <small>{module.description}</small>
                </div>
                <span className="prevention-modules-grid__count">{count}</span>
                <ArrowRight size={17} />
              </button>
            )
          })}
        </div>
      </article>

      <article className="prevention-panel prevention-panel--recent">
        <div className="prevention-panel__heading">
          <div>
            <span>Πρόσφατη δραστηριότητα</span>
            <h2>Τελευταίες καταχωρήσεις</h2>
          </div>
        </div>
        {recentItems.length ? (
          <div className="prevention-recent-list">
            {recentItems.map((item) => (
              <button key={`${item.type}-${item.id}`} type="button" onClick={() => navigate(item.path)}>
                <span className="prevention-recent-list__icon">{item.icon}</span>
                <div className="prevention-recent-list__main">
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </div>
                <span>{item.date || '—'}</span>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        ) : (
          <div className="prevention-empty-state">
            <ShieldCheck size={28} />
            <strong>Δεν υπάρχουν ακόμη καταχωρήσεις</strong>
            <span>Ξεκινήστε από μία από τις ενότητες πρόληψης.</span>
          </div>
        )}
      </article>
    </section>
  )
}

function StatusCard({ icon, title, value, description, action, onClick, warning = false }) {
  return (
    <article className={`prevention-status-card${warning ? ' prevention-status-card--warning' : ''}`}>
      <div className="prevention-status-card__top">
        <span>{icon}</span>
        <strong>{value}</strong>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" onClick={onClick}>{action}<ArrowRight size={16} /></button>
    </article>
  )
}

function calculateMetrics(data) {
  const observations = data.handHygiene.flatMap((session) => Array.isArray(session.observations) ? session.observations : [])
  const compliant = observations.filter(isCompliantObservation).length
  const handCompliance = observations.length ? (compliant / observations.length) * 100 : null
  const antisepticMl = data.antiseptics.reduce((sum, item) => sum + number(item.consumption), 0)
  const wasteKg = data.waste.reduce((sum, item) => sum + number(item.weightKg), 0)
  const hazardousKg = data.waste
    .filter((item) => isHazardous(item.wasteType))
    .reduce((sum, item) => sum + number(item.weightKg), 0)
  const bundleValues = [...data.bundles.map((item) => bundleCompliance(item)), ...data.formResponses.filter((item) => item.module === 'bundles').map((item) => numberOrNull(item.compliance))].filter((value) => value != null)
  const auditScores = data.audits.map((item) => numberOrNull(item.score)).filter((value) => value != null)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const openAudits = data.audits.filter((item) => !isCompleted(item.status)).length
  const overdueAudits = data.audits.filter((item) => {
    if (isCompleted(item.status) || !item.dueDate) return false
    const due = parseDate(item.dueDate)
    return due && due < today
  }).length

  return {
    handObservations: observations.length,
    handCompliance,
    antisepticLitres: antisepticMl / 1000,
    wasteKg,
    hazardousWastePercent: wasteKg ? (hazardousKg / wasteKg) * 100 : 0,
    bundleCompliance: average(bundleValues),
    auditScore: average(auditScores),
    openAudits,
    overdueAudits,
  }
}

function buildRecentItems(data) {
  const items = [
    ...data.handHygiene.map((item) => ({
      ...item,
      type: 'hand',
      path: '/prevention/hand-hygiene',
      title: 'Παρατήρηση Υγιεινής Χεριών',
      subtitle: [item.department, `${Array.isArray(item.observations) ? item.observations.length : 0} παρατηρήσεις`].filter(Boolean).join(' • '),
      icon: <Hand size={18} />,
    })),
    ...data.antiseptics.map((item) => ({
      ...item,
      type: 'antiseptic',
      path: '/prevention/antiseptic-consumption',
      title: 'Μέτρηση Αντισηπτικού',
      subtitle: [item.department, item.product].filter(Boolean).join(' • '),
      icon: <PackageCheck size={18} />,
    })),
    ...data.waste.map((item) => ({
      ...item,
      type: 'waste',
      path: '/prevention/waste',
      title: 'Μέτρηση Αποβλήτων',
      subtitle: [item.department, item.wasteType, item.weightKg ? `${item.weightKg} kg` : ''].filter(Boolean).join(' • '),
      icon: <Recycle size={18} />,
    })),
    ...data.bundles.map((item) => ({
      ...item,
      type: 'bundle',
      path: '/prevention/bundles',
      title: 'Καταχώρηση Bundle',
      subtitle: [item.department, item.bundleType, item.compliance ? `${item.compliance}%` : ''].filter(Boolean).join(' • '),
      icon: <BadgeCheck size={18} />,
    })),
    ...data.formResponses.filter((item) => item.module === 'bundles').map((item) => ({
      ...item,
      type: 'bundle-response',
      path: '/prevention/bundles',
      title: item.templateName || 'Εκτέλεση Bundle',
      subtitle: [item.department, item.compliance != null ? `${item.compliance}%` : ''].filter(Boolean).join(' • '),
      icon: <BadgeCheck size={18} />,
    })),
  ]

  return items
    .sort((a, b) => dateValue(b.updatedAt || b.date) - dateValue(a.updatedAt || a.date))
    .slice(0, 8)
}

function buildMonthlyActivity(data) {
  const months = []
  const now = new Date()
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      year: date.getFullYear(),
      month: date.getMonth(),
      label: new Intl.DateTimeFormat('el-GR', { month: 'short' }).format(date).replace('.', ''),
      value: 0,
    })
  }
  const records = [...data.handHygiene, ...data.antiseptics, ...data.waste, ...data.bundles, ...data.formResponses]
  records.forEach((record) => {
    const date = parseDate(record.date || record.updatedAt)
    if (!date) return
    const month = months.find((item) => item.year === date.getFullYear() && item.month === date.getMonth())
    if (month) month.value += 1
  })
  const max = Math.max(1, ...months.map((item) => item.value))
  return months.map((item) => ({ ...item, height: (item.value / max) * 100 }))
}

function buildAttentionItems(metrics, data) {
  const items = []
  if (metrics.handCompliance != null && metrics.handCompliance < 85) {
    items.push({ id: 'hand', title: 'Χαμηλή συμμόρφωση Υγιεινής Χεριών', description: `Η συνολική συμμόρφωση είναι ${formatNumber(metrics.handCompliance, 1)}%.`, path: '/prevention/hand-hygiene', tone: 'warning' })
  }
  if (metrics.bundleCompliance != null && metrics.bundleCompliance < 90) {
    items.push({ id: 'bundles', title: 'Bundles κάτω από τον στόχο', description: `Η μέση συμμόρφωση είναι ${formatNumber(metrics.bundleCompliance, 1)}%.`, path: '/prevention/bundles', tone: 'warning' })
  }
  if (!data.handHygiene.length) {
    items.push({ id: 'empty-hand', title: 'Δεν υπάρχουν παρατηρήσεις WHO', description: 'Καταχωρήστε την πρώτη συνεδρία Υγιεινής Χεριών.', path: '/prevention/hand-hygiene', tone: 'neutral' })
  }
  if (!data.antiseptics.length) {
    items.push({ id: 'empty-antiseptic', title: 'Δεν υπάρχουν μετρήσεις αντισηπτικών', description: 'Ξεκινήστε την παρακολούθηση κατανάλωσης.', path: '/prevention/antiseptic-consumption', tone: 'neutral' })
  }
  if (!items.length) {
    items.push({ id: 'ok', title: 'Δεν εντοπίστηκαν κρίσιμες εκκρεμότητες', description: 'Οι βασικοί δείκτες πρόληψης βρίσκονται σε σταθερή κατάσταση.', path: '/prevention/bundles', tone: 'success' })
  }
  return items.slice(0, 4)
}

function moduleCount(id, data) {
  if (id === 'hand-hygiene') return data.handHygiene.length
  if (id === 'antiseptics') return data.antiseptics.length
  if (id === 'waste') return data.waste.length
  if (id === 'bundles') return data.bundles.length + data.formResponses.filter((item) => item.module === 'bundles').length
  return 0
}

function isCompliantObservation(observation) {
  const values = [observation.compliant, observation.compliance, observation.result, observation.action]
    .map((value) => String(value ?? '').trim().toLocaleLowerCase('el-GR'))
  return values.some((value) => ['true', '1', 'ναι', 'συμμόρφωση', 'συμμορφώθηκε', 'αντισηψία', 'πλύσιμο'].includes(value))
}

function bundleCompliance(item) {
  const direct = numberOrNull(item.compliance)
  if (direct != null) return direct
  const eligible = number(item.eligibleItems)
  const compliant = number(item.compliantItems)
  return eligible > 0 ? (compliant / eligible) * 100 : null
}

function isCompleted(status) {
  return ['ολοκληρωμένο', 'ολοκληρωμένη', 'κλειστό', 'κλειστή'].includes(String(status || '').trim().toLocaleLowerCase('el-GR'))
}

function isHazardous(value) {
  const text = String(value || '').toLocaleLowerCase('el-GR')
  return ['επικίνδ', 'μολυσ', 'αιχμηρ', 'τοξικ', 'φαρμακευ', 'κυτταρο'].some((term) => text.includes(term))
}

function scoreTone(value) {
  if (value == null) return 'default'
  if (value >= 90) return 'success'
  if (value >= 80) return 'warning'
  return 'danger'
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function number(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function numberOrNull(value) {
  if (value === '' || value == null) return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString('el-GR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function dateValue(value) {
  const date = parseDate(value)
  return date ? date.getTime() : 0
}

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const text = String(value).trim()
  const greek = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (greek) {
    const date = new Date(Number(greek[3]), Number(greek[2]) - 1, Number(greek[1]))
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

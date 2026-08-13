import { APP_ROUTES } from '../../config/routes'
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
  Syringe,
  Pill,
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
import {
  STAFF_VACCINATIONS_EVENT,
  loadStaffVaccinations,
  PROMOTED_ANTIBIOTICS_EVENT,
  loadPromotedAntibiotics,
} from '../../services/preventionService'
import { FORM_TEMPLATES_EVENT, loadFormTemplates } from '../../services/formTemplatesService'
import { FORM_RESPONSES_EVENT, loadFormResponses } from '../../services/formResponsesService'
import StatCard from '../../components/core/StatCard/StatCard'
import { useI18n } from '../../i18n'
import './PreventionCenterPage.css'

const EVENTS = [
  HAND_HYGIENE_EVENT,
  ANTISEPTIC_CONSUMPTION_EVENT,
  WASTE_MEASUREMENTS_EVENT,
  PREVENTION_AUDITS_EVENT,
  BUNDLES_EVENT,
  STAFF_VACCINATIONS_EVENT,
  PROMOTED_ANTIBIOTICS_EVENT,
  FORM_TEMPLATES_EVENT,
  FORM_RESPONSES_EVENT,
]

const MODULES = [
  {
    id: 'hand-hygiene',
    titleEl: 'Υγιεινή Χεριών', titleEn: 'Hand Hygiene',
    descriptionEl: 'Παρατηρήσεις WHO και συμμόρφωση.', descriptionEn: 'WHO observations and compliance.',
    icon: Hand,
    path: APP_ROUTES.HAND_HYGIENE,
  },
  {
    id: 'vaccinations',
    titleEl: 'Εμβολιασμοί Προσωπικού', titleEn: 'Staff Vaccinations',
    descriptionEl: 'Καταγραφή και παρακολούθηση εμβολιασμών εργαζομένων.', descriptionEn: 'Record and monitor staff vaccinations.',
    icon: Syringe,
    path: APP_ROUTES.VACCINATIONS,
  },
  {
    id: 'promoted-antibiotics',
    titleEl: 'Προωθημένα Αντιβιοτικά', titleEn: 'Restricted Antibiotics',
    descriptionEl: 'Αιτήματα και εγκρίσεις αντιβιοτικών περιορισμένης χρήσης.', descriptionEn: 'Requests and approvals for restricted-use antimicrobials.',
    icon: Pill,
    path: APP_ROUTES.PROMOTED_ANTIBIOTICS,
  },
  {
    id: 'antiseptics',
    titleEl: 'Κατανάλωση Αντισηπτικών', titleEn: 'Antiseptic Consumption',
    descriptionEl: 'Κατανάλωση και δείκτες ανά τμήμα.', descriptionEn: 'Consumption and indicators by department.',
    icon: PackageCheck,
    path: APP_ROUTES.ANTISEPTIC_CONSUMPTION,
  },
  {
    id: 'waste',
    titleEl: 'Μετρήσεις Αποβλήτων', titleEn: 'Waste Measurements',
    descriptionEl: 'Βάρος, κατηγορίες και δείκτες.', descriptionEn: 'Weight, categories and indicators.',
    icon: Recycle,
    path: APP_ROUTES.WASTE,
  },
  {
    id: 'bundles',
    titleEl: 'Bundles & Checklists', titleEn: 'Bundles & Checklists',
    descriptionEl: 'Έτοιμα και προσαρμοσμένα ερωτηματολόγια.', descriptionEn: 'Ready-made and customized questionnaires.',
    icon: BadgeCheck,
    path: APP_ROUTES.BUNDLES,
  },
]

export default function PreventionCenterPage() {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const navigate = useNavigate()
  const [version, setVersion] = useState(0)

  useAppEvents(EVENTS, () => setVersion((current) => current + 1), { includeStorage: true })

  const data = useMemo(() => {
    const handHygiene = loadHandHygieneSessions()
    const antiseptics = loadAntisepticConsumption()
    const waste = loadWasteMeasurements()
    const audits = loadPreventionAudits()
    const bundles = loadBundles()
    const vaccinations = loadStaffVaccinations()
    const promotedAntibiotics = loadPromotedAntibiotics()
    const formTemplates = loadFormTemplates()
    const formResponses = loadFormResponses()
    return { handHygiene, antiseptics, waste, audits, bundles, vaccinations, promotedAntibiotics, formTemplates, formResponses }
  }, [version])

  const metrics = useMemo(() => calculateMetrics(data), [data])
  const recentItems = useMemo(() => buildRecentItems(data, language), [data, language])
  const activity = useMemo(() => buildMonthlyActivity(data, language), [data, language])

  return (
    <section className="prevention-overview">
      <header className="prevention-overview__header">
        <div>
          <span>{L('Πρόληψη & Συμμόρφωση','Prevention & Compliance')}</span>
          <h1>{L('Επισκόπηση Πρόληψης','Prevention Overview')}</h1>
          <p>{L('Ενιαία εικόνα συμμόρφωσης, καταναλώσεων και δυναμικών bundles & checklists.','Unified view of compliance, consumption and dynamic bundles & checklists.')}</p>
        </div>
        <button type="button" onClick={() => navigate(APP_ROUTES.HAND_HYGIENE)}>
          <Plus size={18} /> {L('Νέα καταχώρηση','New record')}
        </button>
      </header>

      <div className="prevention-overview__kpis">
        <StatCard
          icon={Hand}
          label={L('Συμμόρφωση χεριών','Hand hygiene compliance')}
          value={metrics.handCompliance == null ? '—' : `${formatNumber(metrics.handCompliance, 1)}%`}
          subtitle={`${metrics.handObservations} ${L('παρατηρήσεις','observations')}`}
          tone={scoreTone(metrics.handCompliance)}
        />
        <StatCard
          icon={Droplets}
          label={L('Κατανάλωση αντισηπτικού','Antiseptic consumption')}
          value={`${formatNumber(metrics.antisepticLitres, 2)} L`}
          subtitle={`${data.antiseptics.length} ${L('μετρήσεις','measurements')}`}
        />
        <StatCard
          icon={Recycle}
          label={L('Συνολικά απόβλητα','Total waste')}
          value={`${formatNumber(metrics.wasteKg, 1)} kg`}
          subtitle={`${formatNumber(metrics.hazardousWastePercent, 1, language)}% ${L('επικίνδυνα','hazardous')}`}
        />
        <StatCard
          icon={Target}
          label={L('Συμμόρφωση bundles','Bundle compliance')}
          value={metrics.bundleCompliance == null ? '—' : `${formatNumber(metrics.bundleCompliance, 1)}%`}
          subtitle={`${data.bundles.length} ${L('καταχωρήσεις','records')}`}
          tone={scoreTone(metrics.bundleCompliance)}
        />
      </div>

      <div className="prevention-overview__status-row">
        <StatusCard
          icon={<BadgeCheck size={20} />}
          title={L('Ενεργά πρότυπα','Active templates')}
          value={data.formTemplates.filter((item) => item.status === 'active').length}
          description={L('Bundles, checklists και ερωτηματολόγια διαθέσιμα για χρήση.','Bundles, checklists and questionnaires available for use.')}
          action={L('Άνοιγμα βιβλιοθήκης','Open library')}
          onClick={() => navigate(APP_ROUTES.BUNDLES)}
        />
        <StatusCard
          icon={<ClipboardCheck size={20} />}
          title={L('Εκτελέσεις φορμών','Form executions')}
          value={data.formResponses.length + data.bundles.length}
          description={L('Συμπληρωμένα δυναμικά και παλαιότερα bundles.','Completed dynamic and legacy bundles.')}
          action={L('Προβολή εκτελέσεων','View executions')}
          onClick={() => navigate(APP_ROUTES.BUNDLES)}
        />
        <StatusCard
          icon={<ShieldCheck size={20} />}
          title={L('Προσαρμοσμένες φόρμες','Custom forms')}
          value={data.formTemplates.filter((item) => !String(item.id).startsWith('TPL-')).length}
          description={L('Φόρμες που δημιουργήθηκαν από το νοσοκομείο χωρίς νέο κώδικα.','Forms created by the hospital without new code.')}
          action="Form Designer"
          onClick={() => navigate(APP_ROUTES.FORM_DESIGNER)}
        />
      </div>

      <div className="prevention-overview__main-grid">
        <article className="prevention-panel prevention-panel--activity">
          <div className="prevention-panel__heading">
            <div>
              <span>{L('Δραστηριότητα','Activity')}</span>
              <h2>{L('Καταχωρήσεις τελευταίων 6 μηνών','Records from the last 6 months')}</h2>
            </div>
            <TrendingUp size={22} />
          </div>
          <div className="prevention-activity-chart" aria-label={L('Καταχωρήσεις ανά μήνα','Records by month')}>
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
            <BarChart3 size={17} /> {L('Συνολική δραστηριότητα όλων των ενοτήτων πρόληψης','Total activity across prevention modules')}
          </div>
        </article>

        <article className="prevention-panel prevention-panel--attention">
          <div className="prevention-panel__heading">
            <div>
              <span>{L('Προτεραιότητες','Priorities')}</span>
              <h2>{L('Τι χρειάζεται προσοχή','What needs attention')}</h2>
            </div>
            <Sparkles size={22} />
          </div>
          <div className="prevention-attention-list">
            {buildAttentionItems(metrics, data, language).map((item) => (
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
            <span>{L('Γρήγορη πρόσβαση','Quick access')}</span>
            <h2>{L('Ενότητες πρόληψης','Prevention modules')}</h2>
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
                  <strong>{language === 'en' ? module.titleEn : module.titleEl}</strong>
                  <small>{language === 'en' ? module.descriptionEn : module.descriptionEl}</small>
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
            <span>{L('Πρόσφατη δραστηριότητα','Recent activity')}</span>
            <h2>{L('Τελευταίες καταχωρήσεις','Latest records')}</h2>
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
            <strong>{L('Δεν υπάρχουν ακόμη καταχωρήσεις','No records yet')}</strong>
            <span>{L('Ξεκινήστε από μία από τις ενότητες πρόληψης.','Start from one of the prevention modules.')}</span>
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

function buildRecentItems(data, language='el') {
  const L = (el,en) => language === 'en' ? en : el
  const items = [
    ...data.handHygiene.map((item) => ({
      ...item,
      type: 'hand',
      path: APP_ROUTES.HAND_HYGIENE,
      title: L('Παρατήρηση Υγιεινής Χεριών','Hand Hygiene Observation'),
      subtitle: [item.department, `${Array.isArray(item.observations) ? item.observations.length : 0} ${L('παρατηρήσεις','observations')}`].filter(Boolean).join(' • '),
      icon: <Hand size={18} />,
    })),
    ...data.antiseptics.map((item) => ({
      ...item,
      type: 'antiseptic',
      path: APP_ROUTES.ANTISEPTIC_CONSUMPTION,
      title: L('Μέτρηση Αντισηπτικού','Antiseptic Measurement'),
      subtitle: [item.department, item.product].filter(Boolean).join(' • '),
      icon: <PackageCheck size={18} />,
    })),
    ...data.waste.map((item) => ({
      ...item,
      type: 'waste',
      path: APP_ROUTES.WASTE,
      title: L('Μέτρηση Αποβλήτων','Waste Measurement'),
      subtitle: [item.department, item.wasteType, item.weightKg ? `${item.weightKg} kg` : ''].filter(Boolean).join(' • '),
      icon: <Recycle size={18} />,
    })),
    ...data.vaccinations.map((item) => ({
      ...item,
      type: 'vaccination',
      path: APP_ROUTES.VACCINATIONS,
      title: L('Εμβολιασμός Προσωπικού','Staff Vaccination'),
      subtitle: [item.employeeName, item.vaccine].filter(Boolean).join(' • '),
      icon: <Syringe size={18} />,
    })),
    ...data.promotedAntibiotics.map((item) => ({
      ...item,
      type: 'promoted-antibiotic',
      path: APP_ROUTES.PROMOTED_ANTIBIOTICS,
      title: L('Προωθημένο Αντιβιοτικό','Restricted Antibiotic'),
      subtitle: [item.patientName, item.antibiotic].filter(Boolean).join(' • '),
      icon: <Pill size={18} />,
    })),
    ...data.bundles.map((item) => ({
      ...item,
      type: 'bundle',
      path: APP_ROUTES.BUNDLES,
      title: L('Καταχώρηση Bundle','Bundle Record'),
      subtitle: [item.department, item.bundleType, item.compliance ? `${item.compliance}%` : ''].filter(Boolean).join(' • '),
      icon: <BadgeCheck size={18} />,
    })),
    ...data.formResponses.filter((item) => item.module === 'bundles').map((item) => ({
      ...item,
      type: 'bundle-response',
      path: APP_ROUTES.BUNDLES,
      title: item.templateName || L('Εκτέλεση Bundle','Bundle Execution'),
      subtitle: [item.department, item.compliance != null ? `${item.compliance}%` : ''].filter(Boolean).join(' • '),
      icon: <BadgeCheck size={18} />,
    })),
  ]

  return items
    .sort((a, b) => dateValue(b.updatedAt || b.date) - dateValue(a.updatedAt || a.date))
    .slice(0, 8)
}

function buildMonthlyActivity(data, language='el') {
  const months = []
  const now = new Date()
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    months.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      year: date.getFullYear(),
      month: date.getMonth(),
      label: new Intl.DateTimeFormat(language==='en'?'en-GB':'el-GR', { month: 'short' }).format(date).replace('.', ''),
      value: 0,
    })
  }
  const records = [...data.handHygiene, ...data.antiseptics, ...data.waste, ...data.vaccinations, ...data.promotedAntibiotics, ...data.bundles, ...data.formResponses]
  records.forEach((record) => {
    const date = parseDate(record.date || record.updatedAt)
    if (!date) return
    const month = months.find((item) => item.year === date.getFullYear() && item.month === date.getMonth())
    if (month) month.value += 1
  })
  const max = Math.max(1, ...months.map((item) => item.value))
  return months.map((item) => ({ ...item, height: (item.value / max) * 100 }))
}

function buildAttentionItems(metrics, data, language) {
  const items = []
  if (metrics.handCompliance != null && metrics.handCompliance < 85) {
    items.push({ id: 'hand', title: L('Χαμηλή συμμόρφωση Υγιεινής Χεριών','Low Hand Hygiene compliance'), description: language==='en'?`Overall compliance is ${formatNumber(metrics.handCompliance,1,language)}%.`:`Η συνολική συμμόρφωση είναι ${formatNumber(metrics.handCompliance,1,language)}%.`, path: APP_ROUTES.HAND_HYGIENE, tone: 'warning' })
  }
  if (metrics.bundleCompliance != null && metrics.bundleCompliance < 90) {
    items.push({ id: 'bundles', title: L('Bundles κάτω από τον στόχο','Bundles below target'), description: language==='en'?`Average compliance is ${formatNumber(metrics.bundleCompliance,1,language)}%.`:`Η μέση συμμόρφωση είναι ${formatNumber(metrics.bundleCompliance,1,language)}%.`, path: APP_ROUTES.BUNDLES, tone: 'warning' })
  }
  if (!data.handHygiene.length) {
    items.push({ id: 'empty-hand', title: L('Δεν υπάρχουν παρατηρήσεις WHO','No WHO observations'), description: L('Καταχωρήστε την πρώτη συνεδρία Υγιεινής Χεριών.','Record the first Hand Hygiene session.'), path: APP_ROUTES.HAND_HYGIENE, tone: 'neutral' })
  }
  if (!data.antiseptics.length) {
    items.push({ id: 'empty-antiseptic', title: L('Δεν υπάρχουν μετρήσεις αντισηπτικών','No antiseptic measurements'), description: L('Ξεκινήστε την παρακολούθηση κατανάλωσης.','Start consumption monitoring.'), path: APP_ROUTES.ANTISEPTIC_CONSUMPTION, tone: 'neutral' })
  }
  if (!items.length) {
    items.push({ id: 'ok', title: L('Δεν εντοπίστηκαν κρίσιμες εκκρεμότητες','No critical pending items'), description: L('Οι βασικοί δείκτες πρόληψης βρίσκονται σε σταθερή κατάσταση.','Core prevention indicators are stable.'), path: APP_ROUTES.BUNDLES, tone: 'success' })
  }
  return items.slice(0, 4)
}

function moduleCount(id, data) {
  if (id === 'hand-hygiene') return data.handHygiene.length
  if (id === 'vaccinations') return data.vaccinations.length
  if (id === 'promoted-antibiotics') return data.promotedAntibiotics.length
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

function formatNumber(value, digits = 0, language='el') {
  return Number(value || 0).toLocaleString(language==='en'?'en-GB':'el-GR', {
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

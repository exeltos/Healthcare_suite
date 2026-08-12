import { notifyAction } from '../../components/core/feedback/index'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_EVENTS, useAppEvents } from '../../core/events'
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  Printer,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  BackLink,
  Badge,
  Button,
  Drawer,
  DateRangeFilter,
  EntityCell,
  EntitySummary,
  FormField,
  FormGrid,
  FormSection,
  ListWorkspace,
  PageChrome,
  PageHeader,
  StatCard,
} from '../../components/core'
import { normalizeText, selectedRows, sortRows, uniqueSortedValues } from '../../core/utils/entityList'
import { downloadCsv, printRows } from '../../core/utils/listExport'
import { INDICATORS_EVENT, loadCustomIndicators, loadIndicatorsSnapshot, saveCustomIndicators, updateIndicatorSettings } from '../../services/indicatorsService'
import { INDICATOR_SOURCE_EVENT } from '../../services/indicatorSourceDataService'
import { createCapaFromSource } from '../../services/qualityWorkflowService'
import './IndicatorsCore.css'

function formatValue(row) {
  const value = row.metric?.value
  if (value == null || value === '') return '—'
  const formatted = typeof value === 'number' ? value.toLocaleString('el-GR', { maximumFractionDigits: 2 }) : value
  return row.unit === '%' ? `${formatted}%` : row.unit ? `${formatted} ${row.unit}` : formatted
}

function formatTarget(row) {
  if (row.target === '' || row.target == null) return '—'
  return `${row.direction === 'lower' ? '≤' : '≥'} ${row.target}${row.unit === '%' ? '%' : row.unit ? ` ${row.unit}` : ''}`
}

function Trend({ values = [] }) {
  const usable = values.filter((item) => item.value != null)
  if (!usable.length) return <span className="indicator-no-trend">Δεν υπάρχουν ακόμη αρκετά δεδομένα.</span>
  const max = Math.max(...usable.map((item) => Number(item.value) || 0), 1)
  return <div className="indicator-trend" aria-label="Τάση τελευταίων περιόδων">
    {values.map((item) => <div className="indicator-trend__item" key={`${item.label}-${item.value}`}>
      <div className="indicator-trend__bar"><span style={{ height: `${item.value == null ? 0 : Math.max(5, (Number(item.value) / max) * 100)}%` }} /></div>
      <small>{item.label}</small>
    </div>)}
  </div>
}

const exportColumns = [
  { label: 'Δείκτης', value: (row) => row.name },
  { label: 'Κατηγορία', value: (row) => row.category },
  { label: 'Τιμή', value: (row) => formatValue(row) },
  { label: 'Στόχος', value: (row) => formatTarget(row) },
  { label: 'Περίοδος', value: (row) => row.metric?.periodLabel || row.frequency || '' },
  { label: 'Συχνότητα', value: (row) => row.frequency || '' },
  { label: 'Αποδέκτης', value: (row) => row.recipient || '' },
  { label: 'Κατάσταση', value: (row) => row.status?.label || '' },
]

export default function IndicatorsPage({ managementMode = false }) {
  const navigate=useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [frequency, setFrequency] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rows, setRows] = useState(() => loadIndicatorsSnapshot())
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' })
  const [selectedKeys, setSelectedKeys] = useState([])
  const [active, setActive] = useState(null)
  const [target, setTarget] = useState('')
  const [direction, setDirection] = useState('higher')
  const [notes, setNotes] = useState('')
  const [management, setManagement] = useState({ name:'', category:'', source:'', formula:'', unit:'', frequency:'', recipient:'', description:'' })

  const range = useMemo(() => ({ from: dateFrom, to: dateTo }), [dateFrom, dateTo])

  useEffect(() => {
    setRows(loadIndicatorsSnapshot(range))
    setActive((current) => current ? loadIndicatorsSnapshot(range).find((row) => row.id === current.id) || null : null)
  }, [dateFrom, dateTo])

  useAppEvents([
    INDICATORS_EVENT,
    INDICATOR_SOURCE_EVENT,
    APP_EVENTS.HAND_HYGIENE_UPDATED,
    APP_EVENTS.STAFF_VACCINATIONS_UPDATED,
    APP_EVENTS.EMPLOYEES_UPDATED,
    APP_EVENTS.PATIENT_SAMPLES_UPDATED,
    APP_EVENTS.ISOLATIONS_UPDATED,
  ], () => {
    const next = loadIndicatorsSnapshot({ from: dateFrom, to: dateTo })
    setRows(next)
    setActive((current) => current ? next.find((row) => row.id === current.id) || null : null)
  }, { includeStorage: true })

  const categories = useMemo(() => uniqueSortedValues(rows, (row) => row.category), [rows])
  const frequencies = useMemo(() => uniqueSortedValues(rows, (row) => row.frequency), [rows])
  const statuses = useMemo(() => uniqueSortedValues(rows, (row) => row.status?.label), [rows])
  const filtered = useMemo(() => {
    const query = normalizeText(search)
    return sortRows(rows.filter((row) => (
      (!category || row.category === category)
      && (!status || row.status?.label === status)
      && (!frequency || row.frequency === frequency)
      && (!query || normalizeText([row.name, row.category, row.source, row.recipient, row.status?.label].filter(Boolean).join(' ')).includes(query))
    )), sort)
  }, [rows, search, category, status, frequency, sort])
  const selected = useMemo(() => selectedRows(filtered, selectedKeys), [filtered, selectedKeys])

  const metrics = useMemo(() => ({
    total: rows.length,
    available: rows.filter((row) => row.metric?.value != null).length,
    attention: rows.filter((row) => row.status?.tone === 'danger' || row.status?.tone === 'warning').length,
    automatic: rows.filter((row) => row.mode === 'automatic').length,
  }), [rows])

  function openIndicator(row) {
    setActive(row)
    setTarget(row.target ?? '')
    setDirection(row.direction || 'higher')
    setNotes(row.notes || '')
    setManagement({
      name:row.name||'',
      category:row.category||'',
      source:row.source||'',
      formula:row.formula||'',
      unit:row.unit||'',
      frequency:row.frequency||'',
      recipient:row.recipient||'',
      description:row.description||'',
    })
  }

  function saveSettings(event) {
    event.preventDefault()
    if (!active) return
    const common={ target, direction, notes }
    if(managementMode){
      const patch={...common,...management}
      if(active.official){
        updateIndicatorSettings(active.id,patch)
      }else{
        const custom=loadCustomIndicators()
        saveCustomIndicators(custom.map(row=>row.id===active.id?{...row,...patch}:row))
      }
    }else{
      updateIndicatorSettings(active.id,common)
    }
    const next=loadIndicatorsSnapshot(range)
    setRows(next)
    setActive(next.find((row)=>row.id===active.id)||null)
    notifyAction('Οι ρυθμίσεις του δείκτη αποθηκεύτηκαν.')
  }

  function printSelected() { printRows({ title: 'Δείκτες Healthcare Suite', columns: exportColumns, rows: selected }) }
  function exportSelected() { downloadCsv({ filename: `deiktes-${new Date().toISOString().slice(0, 10)}.csv`, columns: exportColumns, rows: selected }) }
  function printActive() { if (active) printRows({ title: active.name, columns: exportColumns, rows: [active] }) }
  function exportActive() { if (active) downloadCsv({ filename: `deiktis-${active.id}-${new Date().toISOString().slice(0,10)}.csv`, columns: exportColumns, rows: [active] }) }
  function createIndicatorCapa() { if (!active) return; const record=createCapaFromSource({sourceId:active.id,sourceType:'Δείκτης',title:`Απόκλιση δείκτη: ${active.name}`,owner:'Ομάδα Ποιότητας',priority:active.status?.tone==='danger'?'Υψηλή':'Μέτρια',description:`Τιμή ${formatValue(active)} · Στόχος ${formatTarget(active)} · Περίοδος ${active.metric?.periodLabel||active.frequency||'—'}`}); notifyAction(`Δημιουργήθηκε ${record.id}`) }
  function clearFilters() { setSearch(''); setCategory(''); setStatus(''); setFrequency(''); setDateFrom(''); setDateTo('') }

  const columns = [
    { key: 'name', label: 'Δείκτης', sortable: true, render: (row) => <EntityCell primary={row.name} secondary={row.source} /> },
    { key: 'category', label: 'Κατηγορία', sortable: true, width: '190px' },
    { key: 'frequency', label: 'Περίοδος / αναφορά', sortable: true, width: '180px', render: (row) => row.metric?.periodLabel || row.frequency },
    { key: 'value', label: 'Τρέχουσα τιμή', width: '170px', render: (row) => <strong>{formatValue(row)}</strong> },
    { key: 'target', label: 'Στόχος', width: '145px', render: (row) => formatTarget(row) },
    { key: 'status', label: 'Κατάσταση', width: '190px', render: (row) => <Badge tone={row.status?.tone || 'default'}>{row.status?.label || '—'}</Badge> },
  ]

  return <PageChrome className="indicators-core-page" back={managementMode?<BackLink onClick={()=>navigate('/studio')}>Πίσω στο Κέντρο Διαχείρισης</BackLink>:null} header={<PageHeader title="Δείκτες" description={managementMode?'Οι ίδιοι δείκτες της Κεντρικής εικόνας, με δυνατότητα παραμετροποίησης από το Κέντρο Διαχείρισης.':'Αυτόματη παρακολούθηση δεικτών, στόχων, τάσεων και συχνοτήτων αναφοράς.'} />}>
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel="Σύνοψη δεικτών"><StatCard compact icon={BarChart3} label="Σύνολο δεικτών" value={metrics.total}/><StatCard compact icon={CheckCircle2} label="Με διαθέσιμη τιμή" value={metrics.available}/><StatCard compact icon={Clock3} label="Χρειάζονται προσοχή" value={metrics.attention} tone={metrics.attention ? 'warning' : 'default'}/><StatCard compact icon={Database} label="Αυτόματοι" value={metrics.automatic}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder="Αναζήτηση δείκτη, πηγής ή αποδέκτη…"
      activeFilterCount={[search, category, status, frequency, dateFrom, dateTo].filter(Boolean).length} onClearFilters={clearFilters}
      filters={<><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Κατηγορία"><option value="">Όλες οι κατηγορίες</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Κατάσταση"><option value="">Όλες οι καταστάσεις</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select><select value={frequency} onChange={(e) => setFrequency(e.target.value)} aria-label="Συχνότητα"><option value="">Όλες οι συχνότητες</option>{frequencies.map((item) => <option key={item}>{item}</option>)}</select><DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} label="Περίοδος" /></>}
      selectedCount={selected.length} selectedLabel="δείκτες" onClearSelection={() => setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>Εκτύπωση / PDF</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>Εξαγωγή CSV</Button></>}
      columns={columns} rows={filtered} getRowKey={(row) => row.id} onRowClick={openIndicator} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel="Δείκτες" footer={<span>{filtered.length} δείκτες</span>} emptyTitle="Δεν υπάρχουν δείκτες"
    />

    <Drawer open={Boolean(active)} onClose={() => setActive(null)} title={active?.name || 'Δείκτης'} description={active?.description || ''} width={1120} position="center" footer={<div className="indicator-drawer-actions">{!managementMode&&active&&(active.status?.tone==='danger'||active.status?.tone==='warning')&&<Button variant="secondary" icon={<Sparkles size={16}/>} onClick={createIndicatorCapa}>Δημιουργία CAPA</Button>}<Button variant="secondary" icon={<Printer size={16}/>} onClick={printActive}>Εκτύπωση / PDF</Button><Button variant="secondary" icon={<Download size={16}/>} onClick={exportActive}>Εξαγωγή CSV</Button><span className="indicator-drawer-actions__spacer"/><Button variant="secondary" onClick={() => setActive(null)}>Κλείσιμο</Button><Button form="indicator-settings-form" type="submit">Αποθήκευση</Button></div>}>
      {active && <form id="indicator-settings-form" className="indicator-drawer" onSubmit={saveSettings}>
        <EntitySummary columns={4} ariaLabel="Στοιχεία δείκτη"><StatCard compact icon={Activity} label="Τρέχουσα τιμή" value={formatValue(active)}/><StatCard compact icon={Target} label="Στόχος" value={formatTarget(active)}/><StatCard compact icon={Clock3} label="Περίοδος" value={active.metric?.periodLabel || active.frequency || '—'}/><StatCard compact icon={active.metric?.history?.slice(-2).every((x) => x.value != null) && active.metric.history.at(-1)?.value >= active.metric.history.at(-2)?.value ? TrendingUp : TrendingDown} label="Κατάσταση" value={active.status?.label || '—'}/></EntitySummary>
        {managementMode
          ? <><FormSection title="Παραμετροποίηση δείκτη"><FormGrid columns={2}><FormField label="Όνομα"><input value={management.name} onChange={e=>setManagement({...management,name:e.target.value})}/></FormField><FormField label="Κατηγορία"><input value={management.category} onChange={e=>setManagement({...management,category:e.target.value})}/></FormField><FormField label="Πηγή δεδομένων"><input disabled={active.official} value={management.source} onChange={e=>setManagement({...management,source:e.target.value})}/></FormField><FormField label="Μονάδα"><input value={management.unit} onChange={e=>setManagement({...management,unit:e.target.value})}/></FormField><FormField label="Συχνότητα αναφοράς"><input value={management.frequency} onChange={e=>setManagement({...management,frequency:e.target.value})}/></FormField><FormField label="Αποδέκτης"><input value={management.recipient} onChange={e=>setManagement({...management,recipient:e.target.value})}/></FormField></FormGrid><FormField label="Περιγραφή"><textarea rows="3" value={management.description} onChange={e=>setManagement({...management,description:e.target.value})}/></FormField><FormField label="Τύπος / υπολογισμός"><textarea rows="3" disabled={active.official} value={management.formula} onChange={e=>setManagement({...management,formula:e.target.value})}/>{active.official&&<small>Η πηγή και ο πραγματικός υπολογισμός των αυτόματων Core δεικτών παραμένουν κλειδωμένα ώστε η εμφανιζόμενη τιμή να μην αποσυνδεθεί από τον υπολογιστικό μηχανισμό.</small>}</FormField></FormSection></>
          : <><FormSection title="Τρέχουσα εικόνα"><FormGrid columns={2}><div className="indicator-readonly"><span>Κατηγορία</span><strong>{active.category}</strong></div><div className="indicator-readonly"><span>Πηγή δεδομένων</span><strong>{active.source}</strong></div><div className="indicator-readonly"><span>Συχνότητα αναφοράς</span><strong>{active.frequency}</strong></div><div className="indicator-readonly"><span>Αποδέκτης</span><strong>{active.recipient}</strong></div></FormGrid></FormSection><FormSection title="Υπολογισμός" description="Η τιμή παράγεται αυτόματα από τις διαθέσιμες καταχωρήσεις της επιλεγμένης περιόδου."><div className="indicator-formula">{active.formula}</div>{active.metric?.numerator != null && <div className="indicator-source-summary"><span>Αριθμητής</span><strong>{active.metric.numerator}</strong>{active.metric.denominator != null && <><span>Παρονομαστής</span><strong>{active.metric.denominator}</strong></>}</div>}</FormSection></>}
        <FormSection title="Στοιχεία που χρησιμοποιήθηκαν" description="Σύνοψη των καταχωρήσεων που συμμετέχουν στον συγκεκριμένο υπολογισμό."><div className="indicator-input-grid">{(active.metric?.inputs || []).length ? active.metric.inputs.map((item) => <div className="indicator-input-card" key={`${item.label}-${item.value}`}><span>{item.label}</span><strong>{item.value ?? '—'}</strong>{item.detail && <small>{item.detail}</small>}</div>) : <p className="indicator-no-trend">Δεν υπάρχουν ακόμη διαθέσιμα στοιχεία για αυτή την περίοδο.</p>}</div></FormSection>
        <FormSection title="Τάση" description="Προβολή των διαθέσιμων πρόσφατων περιόδων."><Trend values={active.metric?.history || []}/></FormSection>
        <FormSection title="Στόχος & παρατηρήσεις"><FormGrid columns={2}><FormField label="Στόχος"><input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Προαιρετικός εσωτερικός στόχος"/></FormField><FormField label="Κατεύθυνση στόχου"><select value={direction} onChange={(e) => setDirection(e.target.value)}><option value="higher">Υψηλότερα είναι καλύτερα</option><option value="lower">Χαμηλότερα είναι καλύτερα</option></select></FormField></FormGrid><FormField label="Παρατηρήσεις"><textarea rows="5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Εσωτερικές σημειώσεις για τον δείκτη…"/></FormField></FormSection>
      </form>}
    </Drawer>
  </PageChrome>
}

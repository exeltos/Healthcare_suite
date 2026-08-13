import { APP_ROUTES } from '../../config/routes'
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
import { INDICATORS_EVENT, loadCustomIndicators, loadIndicatorsSnapshot } from '../../services/indicatorsService'
import { hydrateIndicatorBackend, saveCustomIndicatorsBackend, updateIndicatorSettingBackend } from '../../services/backend/indicatorBackendService'
import { INDICATOR_SOURCE_EVENT } from '../../services/indicatorSourceDataService'
import { createCapaFromSourceAsync } from '../../services/qualityWorkflowService'
import { useI18n } from '../../i18n'
import './IndicatorsCore.css'

function formatValue(row, language='el') {
  const value = row.metric?.value
  if (value == null || value === '') return '—'
  const formatted = typeof value === 'number' ? value.toLocaleString(language==='en'?'en-GB':'el-GR', { maximumFractionDigits: 2 }) : value
  return row.unit === '%' ? `${formatted}%` : row.unit ? `${formatted} ${row.unit}` : formatted
}

function formatTarget(row) {
  if (row.target === '' || row.target == null) return '—'
  return `${row.direction === 'lower' ? '≤' : '≥'} ${row.target}${row.unit === '%' ? '%' : row.unit ? ` ${row.unit}` : ''}`
}

function Trend({ values = [], language='el' }) {
  const L=(el,en)=>language==='en'?en:el
  const usable = values.filter((item) => item.value != null)
  if (!usable.length) return <span className="indicator-no-trend">{L('Δεν υπάρχουν ακόμη αρκετά δεδομένα.','Not enough data yet.')}</span>
  const max = Math.max(...usable.map((item) => Number(item.value) || 0), 1)
  return <div className="indicator-trend" aria-label={L('Τάση τελευταίων περιόδων','Trend over recent periods')}>
    {values.map((item) => <div className="indicator-trend__item" key={`${item.label}-${item.value}`}>
      <div className="indicator-trend__bar"><span style={{ height: `${item.value == null ? 0 : Math.max(5, (Number(item.value) / max) * 100)}%` }} /></div>
      <small>{item.label}</small>
    </div>)}
  </div>
}

const buildExportColumns = (L) => [
  { label: L('Δείκτης', 'Indicator'), value: (row) => row.name },
  { label: L('Κατηγορία', 'Category'), value: (row) => row.category },
  { label: L('Τιμή','Value'), value: (row) => formatValue(row) },
  { label: L('Στόχος', 'Target'), value: (row) => formatTarget(row) },
  { label: L('Περίοδος','Period'), value: (row) => row.metric?.periodLabel || row.frequency || '' },
  { label: L('Συχνότητα','Frequency'), value: (row) => row.frequency || '' },
  { label: L('Αποδέκτης','Recipient'), value: (row) => row.recipient || '' },
  { label: L('Κατάσταση', 'Status'), value: (row) => row.status?.label || '' },
]

export default function IndicatorsPage({ managementMode = false }) {
  const { language }=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const exportColumns=buildExportColumns(L)
  const format=(row)=>formatValue(row,language)
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
    let activePage=true
    hydrateIndicatorBackend()
      .catch(()=>null)
      .finally(()=>{
        if(!activePage)return
        const next=loadIndicatorsSnapshot(range)
        setRows(next)
        setActive((current)=>current?next.find((row)=>row.id===current.id)||null:null)
      })
    return()=>{activePage=false}
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

  async function saveSettings(event) {
    event.preventDefault()
    if (!active) return
    const common={ target, direction, notes }
    if(managementMode){
      const patch={...common,...management}
      if(active.official){
        await updateIndicatorSettingBackend(active.id,patch)
      }else{
        const custom=loadCustomIndicators()
        await saveCustomIndicatorsBackend(custom.map(row=>row.id===active.id?{...row,...patch}:row))
      }
    }else{
      await updateIndicatorSettingBackend(active.id,common)
    }
    const next=loadIndicatorsSnapshot(range)
    setRows(next)
    setActive(next.find((row)=>row.id===active.id)||null)
    notifyAction(L('Οι ρυθμίσεις του δείκτη αποθηκεύτηκαν.','Indicator settings saved.'))
  }

  function printSelected() { printRows({ title: L('Δείκτες Healthcare Suite','Healthcare Suite Indicators'), columns: exportColumns, rows: selected }) }
  function exportSelected() { downloadCsv({ filename: `deiktes-${new Date().toISOString().slice(0, 10)}.csv`, columns: exportColumns, rows: selected }) }
  function printActive() { if (active) printRows({ title: active.name, columns: exportColumns, rows: [active] }) }
  function exportActive() { if (active) downloadCsv({ filename: `deiktis-${active.id}-${new Date().toISOString().slice(0,10)}.csv`, columns: exportColumns, rows: [active] }) }
  async function createIndicatorCapa() { if (!active) return; const record=await createCapaFromSourceAsync({sourceId:active.id,sourceType:'Δείκτης',title:`Απόκλιση δείκτη: ${active.name}`,owner:'Ομάδα Ποιότητας',priority:active.status?.tone==='danger'?'Υψηλή':'Μέτρια',description:`Τιμή ${format(active)} · Στόχος ${formatTarget(active)} · Περίοδος ${active.metric?.periodLabel||active.frequency||'—'}`}); notifyAction(`${L('Δημιουργήθηκε','Created')} ${record.id}`) }
  function clearFilters() { setSearch(''); setCategory(''); setStatus(''); setFrequency(''); setDateFrom(''); setDateTo('') }

  const columns = [
    { key: 'name', label: L('Δείκτης', 'Indicator'), sortable: true, render: (row) => <EntityCell primary={row.name} secondary={row.source} /> },
    { key: 'category', label: L('Κατηγορία', 'Category'), sortable: true, width: '190px' },
    { key: 'frequency', label: L('Περίοδος / αναφορά', 'Period / reporting'), sortable: true, width: '180px', render: (row) => row.metric?.periodLabel || row.frequency },
    { key: 'value', label: L('Τρέχουσα τιμή', 'Current value'), width: '170px', render: (row) => <strong>{format(row)}</strong> },
    { key: 'target', label: L('Στόχος', 'Target'), width: '145px', render: (row) => formatTarget(row) },
    { key: 'status', label: L('Κατάσταση', 'Status'), width: '190px', render: (row) => <Badge tone={row.status?.tone || 'default'}>{row.status?.label || '—'}</Badge> },
  ]

  return <PageChrome className="indicators-core-page" back={managementMode?<BackLink onClick={()=>navigate(APP_ROUTES.STUDIO)}>{L('Πίσω στο Κέντρο Διαχείρισης','Back to Management Center')}</BackLink>:null} header={<PageHeader title={L('Δείκτες','Indicators')} description={managementMode?L('Οι ίδιοι δείκτες της Κεντρικής εικόνας, με δυνατότητα παραμετροποίησης από το Κέντρο Διαχείρισης.','The same indicators as the central view, configurable from the Management Center.'):L('Αυτόματη παρακολούθηση δεικτών, στόχων, τάσεων και συχνοτήτων αναφοράς.','Automatic monitoring of indicators, targets, trends and reporting frequencies.')} />}>
    <ListWorkspace
      stats={<EntitySummary columns={4} ariaLabel={L('Σύνοψη δεικτών','Indicator summary')}><StatCard compact icon={BarChart3} label={L('Σύνολο δεικτών','Total indicators')} value={metrics.total}/><StatCard compact icon={CheckCircle2} label={L('Με διαθέσιμη τιμή','With available value')} value={metrics.available}/><StatCard compact icon={Clock3} label={L('Χρειάζονται προσοχή','Need attention')} value={metrics.attention} tone={metrics.attention ? 'warning' : 'default'}/><StatCard compact icon={Database} label={L('Αυτόματοι','Automatic')} value={metrics.automatic}/></EntitySummary>}
      searchValue={search} onSearchChange={setSearch} searchPlaceholder={L('Αναζήτηση δείκτη, πηγής ή αποδέκτη…','Search indicator, source or recipient…')}
      activeFilterCount={[search, category, status, frequency, dateFrom, dateTo].filter(Boolean).length} onClearFilters={clearFilters}
      filters={<><select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={L('Κατηγορία','Category')}><option value="">{L('Όλες οι κατηγορίες','All categories')}</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={L('Κατάσταση','Status')}><option value="">{L('Όλες οι καταστάσεις','All statuses')}</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select><select value={frequency} onChange={(e) => setFrequency(e.target.value)} aria-label={L('Συχνότητα','Frequency')}><option value="">{L('Όλες οι συχνότητες','All frequencies')}</option>{frequencies.map((item) => <option key={item}>{item}</option>)}</select><DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} label={L('Περίοδος','Period')} /></>}
      selectedCount={selected.length} selectedLabel={L('δείκτες','indicators')} onClearSelection={() => setSelectedKeys([])}
      bulkActions={<><Button variant="secondary" size="sm" icon={<Printer size={16}/>} onClick={printSelected}>{L('Εκτύπωση / PDF','Print / PDF')}</Button><Button variant="secondary" size="sm" icon={<Download size={16}/>} onClick={exportSelected}>{L('Εξαγωγή CSV','Export CSV')}</Button></>}
      columns={columns} rows={filtered} getRowKey={(row) => row.id} onRowClick={openIndicator} selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} sort={sort} onSortChange={setSort} ariaLabel={L('Δείκτες','Indicators')} footer={<span>{filtered.length} {L('δείκτες','indicators')}</span>} emptyTitle={L('Δεν υπάρχουν δείκτες','No indicators')}
    />

    <Drawer open={Boolean(active)} onClose={() => setActive(null)} title={active?.name || L('Δείκτης','Indicator')} description={active?.description || ''} width={1120} position="center" footer={<div className="indicator-drawer-actions">{!managementMode&&active&&(active.status?.tone==='danger'||active.status?.tone==='warning')&&<Button variant="secondary" icon={<Sparkles size={16}/>} onClick={createIndicatorCapa}>{L('Δημιουργία CAPA','Create CAPA')}</Button>}<Button variant="secondary" icon={<Printer size={16}/>} onClick={printActive}>{L('Εκτύπωση / PDF','Print / PDF')}</Button><Button variant="secondary" icon={<Download size={16}/>} onClick={exportActive}>{L('Εξαγωγή CSV','Export CSV')}</Button><span className="indicator-drawer-actions__spacer"/><Button variant="secondary" onClick={() => setActive(null)}>{L('Κλείσιμο','Close')}</Button><Button form="indicator-settings-form" type="submit">{L('Αποθήκευση','Save')}</Button></div>}>
      {active && <form id="indicator-settings-form" className="indicator-drawer" onSubmit={saveSettings}>
        <EntitySummary columns={4} ariaLabel={L('Στοιχεία δείκτη','Indicator details')}><StatCard compact icon={Activity} label={L('Τρέχουσα τιμή','Current value')} value={format(active)}/><StatCard compact icon={Target} label={L('Στόχος','Target')} value={formatTarget(active)}/><StatCard compact icon={Clock3} label={L('Περίοδος','Period')} value={active.metric?.periodLabel || active.frequency || '—'}/><StatCard compact icon={active.metric?.history?.slice(-2).every((x) => x.value != null) && active.metric.history.at(-1)?.value >= active.metric.history.at(-2)?.value ? TrendingUp : TrendingDown} label={L('Κατάσταση','Status')} value={active.status?.label || '—'}/></EntitySummary>
        {managementMode
          ? <><FormSection title={L('Παραμετροποίηση δείκτη','Indicator configuration')}><FormGrid columns={2}><FormField label={L('Όνομα','Name')}><input value={management.name} onChange={e=>setManagement({...management,name:e.target.value})}/></FormField><FormField label={L('Κατηγορία','Category')}><input value={management.category} onChange={e=>setManagement({...management,category:e.target.value})}/></FormField><FormField label={L('Πηγή δεδομένων','Data source')}><input disabled={active.official} value={management.source} onChange={e=>setManagement({...management,source:e.target.value})}/></FormField><FormField label={L('Μονάδα','Unit')}><input value={management.unit} onChange={e=>setManagement({...management,unit:e.target.value})}/></FormField><FormField label={L('Συχνότητα αναφοράς','Reporting frequency')}><input value={management.frequency} onChange={e=>setManagement({...management,frequency:e.target.value})}/></FormField><FormField label={L('Αποδέκτης','Recipient')}><input value={management.recipient} onChange={e=>setManagement({...management,recipient:e.target.value})}/></FormField></FormGrid><FormField label={L('Περιγραφή','Description')}><textarea rows="3" value={management.description} onChange={e=>setManagement({...management,description:e.target.value})}/></FormField><FormField label={L('Τύπος / υπολογισμός','Type / calculation')}><textarea rows="3" disabled={active.official} value={management.formula} onChange={e=>setManagement({...management,formula:e.target.value})}/>{active.official&&<small>{L("Η πηγή και ο πραγματικός υπολογισμός των αυτόματων Core δεικτών παραμένουν κλειδωμένα ώστε η εμφανιζόμενη τιμή να μην αποσυνδεθεί από τον υπολογιστικό μηχανισμό.","The source and actual calculation of automatic Core indicators remain locked so the displayed value stays connected to the calculation engine.")}</small>}</FormField></FormSection></>
          : <><FormSection title={L('Τρέχουσα εικόνα','Current view')}><FormGrid columns={2}><div className="indicator-readonly"><span>{L('Κατηγορία','Category')}</span><strong>{active.category}</strong></div><div className="indicator-readonly"><span>{L('Πηγή δεδομένων','Data source')}</span><strong>{active.source}</strong></div><div className="indicator-readonly"><span>{L('Συχνότητα αναφοράς','Reporting frequency')}</span><strong>{active.frequency}</strong></div><div className="indicator-readonly"><span>{L('Αποδέκτης','Recipient')}</span><strong>{active.recipient}</strong></div></FormGrid></FormSection><FormSection title={L('Υπολογισμός','Calculation')} description={L("Η τιμή παράγεται αυτόματα από τις διαθέσιμες καταχωρήσεις της επιλεγμένης περιόδου.","The value is calculated automatically from available records in the selected period.")}><div className="indicator-formula">{active.formula}</div>{active.metric?.numerator != null && <div className="indicator-source-summary"><span>{L('Αριθμητής','Numerator')}</span><strong>{active.metric.numerator}</strong>{active.metric.denominator != null && <><span>{L('Παρονομαστής','Denominator')}</span><strong>{active.metric.denominator}</strong></>}</div>}</FormSection></>}
        <FormSection title={L('Στοιχεία που χρησιμοποιήθηκαν','Inputs used')} description={L("Σύνοψη των καταχωρήσεων που συμμετέχουν στον συγκεκριμένο υπολογισμό.","Summary of records used in this calculation.")}><div className="indicator-input-grid">{(active.metric?.inputs || []).length ? active.metric.inputs.map((item) => <div className="indicator-input-card" key={`${item.label}-${item.value}`}><span>{item.label}</span><strong>{item.value ?? '—'}</strong>{item.detail && <small>{item.detail}</small>}</div>) : <p className="indicator-no-trend">{L("Δεν υπάρχουν ακόμη διαθέσιμα στοιχεία για αυτή την περίοδο.","No data available for this period yet.")}</p>}</div></FormSection>
        <FormSection title={L('Τάση','Trend')} description={L("Προβολή των διαθέσιμων πρόσφατων περιόδων.","View available recent periods.")}><Trend values={active.metric?.history || []} language={language}/></FormSection>
        <FormSection title={L('Στόχος & παρατηρήσεις','Target & notes')}><FormGrid columns={2}><FormField label={L('Στόχος','Target')}><input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={L('Προαιρετικός εσωτερικός στόχος','Optional internal target')}/></FormField><FormField label={L('Κατεύθυνση στόχου','Target direction')}><select value={direction} onChange={(e) => setDirection(e.target.value)}><option value="higher">{L("Υψηλότερα είναι καλύτερα","Higher is better")}</option><option value="lower">{L("Χαμηλότερα είναι καλύτερα","Lower is better")}</option></select></FormField></FormGrid><FormField label={L('Παρατηρήσεις','Notes')}><textarea rows="5" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={L('Εσωτερικές σημειώσεις για τον δείκτη…','Internal notes for the indicator…')}/></FormField></FormSection>
      </form>}
    </Drawer>
  </PageChrome>
}

import { APP_ROUTES } from '../../config/routes'
import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Plus, SearchCheck, ShieldAlert, Sparkles } from 'lucide-react'
import { Button, Card, EntitySummary, PageChrome, PageHeader, PageSection, StatCard } from '../../components/core'
import { QUALITY_EVENT, loadCapa, loadIncidents, AUDITS_EVENT, loadAuditExecutions } from '../../services/qualityService'
import { loadQualityAudits, loadQualityCapa, loadQualityIncidents } from '../../services/backend/qualityBackendService'
import { hydrateIndicatorBackend } from '../../services/backend/indicatorBackendService'
import { INDICATORS_EVENT, loadIndicatorsSnapshot } from '../../services/indicatorsService'
import { useI18n } from '../../i18n'
import './QualityUnified.css'

export default function QualityCenterPage(){
  const { language } = useI18n()
  const L = (el,en) => language === 'en' ? en : el
  const navigate=useNavigate()
  const [version,setVersion]=useState(0)
  useAppEvents([QUALITY_EVENT, INDICATORS_EVENT, AUDITS_EVENT], () => setVersion(v => v + 1), { includeStorage: true })
  useEffect(()=>{Promise.all([loadQualityIncidents(),loadQualityCapa(),loadQualityAudits(),hydrateIndicatorBackend()]).then(()=>setVersion(v=>v+1)).catch(()=>{})},[])
  const data=useMemo(()=>({incidents:loadIncidents(),capa:loadCapa(),indicators:loadIndicatorsSnapshot(),audits:loadAuditExecutions()}),[version])
  const today=new Date().toISOString().slice(0,10)
  const openIncidents=data.incidents.filter(x=>x.status!=='Κλειστό').length
  const severe=data.incidents.filter(x=>['Σοβαρή βλάβη','Θάνατος'].includes(x.outcome)).length
  const openCapa=data.capa.filter(x=>!['Ολοκληρωμένη','Ακυρωμένη'].includes(x.status)).length
  const overdue=data.capa.filter(x=>x.dueDate&&x.dueDate<today&&!['Ολοκληρωμένη','Ακυρωμένη'].includes(x.status)).length
  const verification=data.capa.filter(x=>x.status==='Σε επαλήθευση'||(x.effectivenessStatus==='Εκκρεμεί'&&Number(x.progress)>=100)).length
  const findings=data.audits.reduce((sum,row)=>sum+(row.findings||[]).filter(f=>f.status!=='Κλειστό').length,0)
  const indicatorsOut=data.indicators.filter(x=>['danger','warning'].includes(x.status?.tone)).length

  return <PageChrome className="quality-unified-page" header={<PageHeader
    title={L('Κέντρο Ποιότητας','Quality Center')}
    description={L('Μία ενιαία ροή από το συμβάν ή το εύρημα έως τη διορθωτική ενέργεια, την επαλήθευση και το κλείσιμο.','One connected flow from incident or finding to corrective action, verification and closure.')}
    actions={<Button icon={<Plus size={17}/>} onClick={()=>navigate(APP_ROUTES.QUALITY_INCIDENTS)}>{L('Νέο συμβάν','New incident')}</Button>}
  />}>
    <EntitySummary columns={4}>
      <StatCard compact icon={ShieldAlert} label={L('Ανοικτά συμβάντα','Open incidents')} value={openIncidents} tone={severe?'warning':'default'}/>
      <StatCard compact icon={ClipboardCheck} label={L('Ενεργές CAPA','Active CAPA')} value={openCapa} tone={overdue?'warning':'default'}/>
      <StatCard compact icon={SearchCheck} label={L('Ανοικτά ευρήματα','Open findings')} value={findings}/>
      <StatCard compact icon={CheckCircle2} label={L('Σε επαλήθευση','In verification')} value={verification}/>
    </EntitySummary>

    <PageSection title={L('Ενιαία ροή ποιότητας','Unified quality workflow')} description={L('Οι ενότητες παραμένουν ξεχωριστές για καθαρή εργασία, αλλά οι εγγραφές συνδέονται μεταξύ τους.','Modules remain separate for clear work, while records stay connected.')}>
      <div className="quality-hub-flow">
        <span>{L('Συμβάν / Audit / Δείκτης','Incident / Audit / Indicator')}</span><b>→</b>
        <span>{L('Διερεύνηση / Εύρημα','Investigation / Finding')}</span><b>→</b>
        <span>CAPA</span><b>→</b><span>Verification</span><b>→</b><span>{L('Κλείσιμο','Closure')}</span>
      </div>
    </PageSection>

    <div className="quality-workflow-grid">
      <Card className="quality-workflow-card"><div className="quality-workflow-card__head"><AlertTriangle size={20}/><h3>{L('Συμβάντα','Incidents')}</h3></div><p>{L('Αναφορά, βαθμός βλάβης, άμεση αντιμετώπιση, contributing factors και root cause. Από το ίδιο συμβάν δημιουργείται Audit ή CAPA χωρίς επανάληψη στοιχείων.','Report, harm level, immediate response, contributing factors and root cause. Create an Audit or CAPA from the same incident without duplicating data.')}</p><Button variant="secondary" icon={<ArrowRight size={16}/>} onClick={()=>navigate(APP_ROUTES.QUALITY_INCIDENTS)}>{L('Άνοιγμα συμβάντων','Open incidents')}</Button></Card>
      <Card className="quality-workflow-card"><div className="quality-workflow-card__head"><SearchCheck size={20}/><h3>Audit</h3></div><p>{L('Εκτέλεση από κοινά πρότυπα Form Designer, συμμόρφωση, τεκμηριωμένα ευρήματα και άμεση σύνδεση κάθε μη συμμόρφωσης με CAPA.','Execution from shared Form Designer templates, compliance, documented findings and direct linkage of each non-conformity to CAPA.')}</p><Button variant="secondary" icon={<ArrowRight size={16}/>} onClick={()=>navigate(APP_ROUTES.QUALITY_AUDITS)}>{L('Άνοιγμα Audit','Open Audit')}</Button></Card>
      <Card className="quality-workflow-card"><div className="quality-workflow-card__head"><Sparkles size={20}/><h3>CAPA</h3></div><p>{L('Μία κοινή δεξαμενή ενεργειών για συμβάντα, audits, δείκτες, παράπονα και επιτροπές. Δεν επιτρέπεται κλείσιμο χωρίς επιβεβαίωση αποτελεσματικότητας.','One shared action pool for incidents, audits, indicators, complaints and committees. Closure is not allowed without effectiveness verification.')}</p><Button variant="secondary" icon={<ArrowRight size={16}/>} onClick={()=>navigate(APP_ROUTES.QUALITY_CAPA)}>{L('Άνοιγμα CAPA','Open CAPA')}</Button></Card>
    </div>

    <PageSection title={L('Τι χρειάζεται προσοχή','What needs attention')} description={L('Συγκεντρωτική εικόνα χωρίς να δημιουργούμε δεύτερο dashboard δεδομένων.','A consolidated view without creating a second data dashboard.')}>
      <div className="quality-why-grid">
        <Card className="quality-why-card"><strong>{severe} {L('σοβαρά συμβάντα','severe incidents')}</strong><span>{L('Απαιτούν προτεραιοποίηση διερεύνησης και άμεση αξιολόγηση ενεργειών.','Require prioritized investigation and immediate action review.')}</span></Card>
        <Card className="quality-why-card"><strong>{overdue} {L('εκπρόθεσμες CAPA','overdue CAPA')}</strong><span>{L('Έχουν περάσει την προθεσμία χωρίς ολοκλήρωση και επαλήθευση.','Past due without completion and verification.')}</span></Card>
        <Card className="quality-why-card"><strong>{verification} {L('ενέργειες σε verification','actions in verification')}</strong><span>{L('Η υλοποίηση έχει προχωρήσει, αλλά πρέπει να αποδειχθεί η αποτελεσματικότητα.','Implementation progressed, but effectiveness still needs evidence.')}</span></Card>
        <Card className="quality-why-card"><strong>{indicatorsOut} {L('δείκτες χρειάζονται προσοχή','indicators need attention')}</strong><span>{L('Από τον ίδιο τον δείκτη μπορεί να δημιουργηθεί CAPA όταν υπάρχει απόκλιση.','A CAPA can be created directly from an indicator when deviation occurs.')}</span></Card>
      </div>
    </PageSection>
  </PageChrome>
}

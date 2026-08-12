import { useEffect, useMemo, useState } from 'react'
import { useAppEvents } from '../../core/events'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Gauge, Plus, SearchCheck, ShieldAlert, Sparkles } from 'lucide-react'
import { Button, Card, EntitySummary, PageChrome, PageHeader, PageSection, StatCard } from '../../components/core'
import { QUALITY_EVENT, loadCapa, loadIncidents } from '../../services/qualityService'
import { INDICATORS_EVENT, loadIndicatorsSnapshot } from '../../services/indicatorsService'
import { AUDITS_EVENT, loadAuditExecutions } from '../../services/qualityService'
import './QualityUnified.css'

export default function QualityCenterPage(){
  const navigate=useNavigate();const [version,setVersion]=useState(0)
  useAppEvents([QUALITY_EVENT, INDICATORS_EVENT, AUDITS_EVENT], () => setVersion(v => v + 1), { includeStorage: true })
  const data=useMemo(()=>({incidents:loadIncidents(),capa:loadCapa(),indicators:loadIndicatorsSnapshot(),audits:loadAuditExecutions()}),[version])
  const today=new Date().toISOString().slice(0,10)
  const openIncidents=data.incidents.filter(x=>x.status!=='Κλειστό').length
  const severe=data.incidents.filter(x=>['Σοβαρή βλάβη','Θάνατος'].includes(x.outcome)).length
  const openCapa=data.capa.filter(x=>!['Ολοκληρωμένη','Ακυρωμένη'].includes(x.status)).length
  const overdue=data.capa.filter(x=>x.dueDate&&x.dueDate<today&&!['Ολοκληρωμένη','Ακυρωμένη'].includes(x.status)).length
  const verification=data.capa.filter(x=>x.status==='Σε επαλήθευση'||x.effectivenessStatus==='Εκκρεμεί'&&Number(x.progress)>=100).length
  const findings=data.audits.reduce((sum,row)=>sum+(row.findings||[]).filter(f=>f.status!=='Κλειστό').length,0)
  const indicatorsOut=data.indicators.filter(x=>['danger','warning'].includes(x.status?.tone)).length
  return <PageChrome className="quality-unified-page" header={<PageHeader title="Κέντρο Ποιότητας" description="Μία ενιαία ροή από το συμβάν ή το εύρημα έως τη διορθωτική ενέργεια, την επαλήθευση και το κλείσιμο." actions={<Button icon={<Plus size={17}/>} onClick={()=>navigate('/quality/incidents')}>Νέο συμβάν</Button>}/> }>
    <EntitySummary columns={4}><StatCard compact icon={ShieldAlert} label="Ανοικτά συμβάντα" value={openIncidents} tone={severe?'warning':'default'}/><StatCard compact icon={ClipboardCheck} label="Ενεργές CAPA" value={openCapa} tone={overdue?'warning':'default'}/><StatCard compact icon={SearchCheck} label="Ανοικτά ευρήματα" value={findings}/><StatCard compact icon={CheckCircle2} label="Σε επαλήθευση" value={verification}/></EntitySummary>

    <PageSection title="Ενιαία ροή ποιότητας" description="Οι ενότητες παραμένουν ξεχωριστές για καθαρή εργασία, αλλά οι εγγραφές συνδέονται μεταξύ τους."><div className="quality-hub-flow"><span>Συμβάν / Audit / Δείκτης</span><b>→</b><span>Διερεύνηση / Εύρημα</span><b>→</b><span>CAPA</span><b>→</b><span>Verification</span><b>→</b><span>Κλείσιμο</span></div></PageSection>

    <div className="quality-workflow-grid">
      <Card className="quality-workflow-card"><div className="quality-workflow-card__head"><AlertTriangle size={20}/><h3>Συμβάντα</h3></div><p>Αναφορά, βαθμός βλάβης, άμεση αντιμετώπιση, contributing factors και root cause. Από το ίδιο συμβάν δημιουργείται Audit ή CAPA χωρίς επανάληψη στοιχείων.</p><Button variant="secondary" icon={<ArrowRight size={16}/>} onClick={()=>navigate('/quality/incidents')}>Άνοιγμα συμβάντων</Button></Card>
      <Card className="quality-workflow-card"><div className="quality-workflow-card__head"><SearchCheck size={20}/><h3>Audit</h3></div><p>Εκτέλεση από κοινά πρότυπα Form Designer, συμμόρφωση, τεκμηριωμένα ευρήματα και άμεση σύνδεση κάθε μη συμμόρφωσης με CAPA.</p><Button variant="secondary" icon={<ArrowRight size={16}/>} onClick={()=>navigate('/quality/audits')}>Άνοιγμα Audit</Button></Card>
      <Card className="quality-workflow-card"><div className="quality-workflow-card__head"><Sparkles size={20}/><h3>CAPA</h3></div><p>Μία κοινή δεξαμενή ενεργειών για συμβάντα, audits, δείκτες, παράπονα και επιτροπές. Δεν επιτρέπεται κλείσιμο χωρίς επιβεβαίωση αποτελεσματικότητας.</p><Button variant="secondary" icon={<ArrowRight size={16}/>} onClick={()=>navigate('/quality/capa')}>Άνοιγμα CAPA</Button></Card>
    </div>

    <PageSection title="Τι χρειάζεται προσοχή" description="Συγκεντρωτική εικόνα χωρίς να δημιουργούμε δεύτερο dashboard δεδομένων."><div className="quality-why-grid"><Card className="quality-why-card"><strong>{severe} σοβαρά συμβάντα</strong><span>Απαιτούν προτεραιοποίηση διερεύνησης και άμεση αξιολόγηση ενεργειών.</span></Card><Card className="quality-why-card"><strong>{overdue} εκπρόθεσμες CAPA</strong><span>Έχουν περάσει την προθεσμία χωρίς ολοκλήρωση και επαλήθευση.</span></Card><Card className="quality-why-card"><strong>{verification} ενέργειες σε verification</strong><span>Η υλοποίηση έχει προχωρήσει, αλλά πρέπει να αποδειχθεί η αποτελεσματικότητα.</span></Card><Card className="quality-why-card"><strong>{indicatorsOut} δείκτες χρειάζονται προσοχή</strong><span>Από τον ίδιο τον δείκτη μπορεί να δημιουργηθεί CAPA όταν υπάρχει απόκλιση.</span></Card></div></PageSection>
  </PageChrome>
}

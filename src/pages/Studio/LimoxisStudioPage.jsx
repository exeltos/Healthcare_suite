import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, BellRing, Bot, FormInput, Library, Search, ShieldCheck, Users, Workflow } from 'lucide-react'
import SettingsPage from '../SettingsPage'
import { BackLink, Button, PageChrome } from '../../components/core'
import PageHeader from '../../components/core/PageHeader/PageHeader'
import { APP_ROUTES } from '../../config/routes'
import './LimoxisStudioPage.css'

const GROUPS = [
  {
    id:'access',
    title:'Διαχείριση πρόσβασης',
    text:'Λογαριασμοί χρηστών, ρόλοι και δικαιώματα.',
    tools:[
      {id:'users',icon:Users,title:'Χρήστες',text:'Λογαριασμοί πρόσβασης, σύνδεση με το προσωπικό, τμήματα και πρόσθετες αρμοδιότητες.',note:'Λογαριασμοί',actions:[{label:'Άνοιγμα',path:APP_ROUTES.STUDIO_USERS}]},
      {id:'roles',icon:ShieldCheck,title:'Ρόλοι & Δικαιώματα',text:'Ρόλοι και λειτουργικό scope πρόσβασης κάθε κατηγορίας χρήστη.',note:'Πρόσβαση & ασφάλεια',actions:[{label:'Άνοιγμα',path:APP_ROUTES.STUDIO_ROLES}]},
    ]
  },
  {
    id:'configuration',
    title:'Παραμετροποίηση',
    text:'Master data, φόρμες, δείκτες και τρόπος παρουσίασης.',
    tools:[
      {id:'libraries',icon:Library,title:'Βιβλιοθήκες & Ρυθμίσεις',text:'Τμήματα, μικροοργανισμοί, δείγματα, προϊόντα, πηγές δεδομένων και γενική παραμετροποίηση.',note:'Κεντρικά δεδομένα',actions:[{label:'Άνοιγμα',path:APP_ROUTES.STUDIO_SETTINGS}]},
      {id:'forms',icon:FormInput,title:'Smart Forms',text:'Δημιουργία και διαχείριση bundles, audits, checklists και ερωτηματολογίων.',note:'Form Designer',actions:[{label:'Άνοιγμα',path:APP_ROUTES.FORM_DESIGNER}]},
      {id:'indicators',icon:BarChart3,title:'Δείκτες',text:'Οι ίδιοι δείκτες που εμφανίζονται στην Κεντρική εικόνα, με διαχείριση πηγών, στόχων και παραμέτρων.',note:'KPI & παραμετροποίηση',actions:[{label:'Άνοιγμα',path:APP_ROUTES.STUDIO_INDICATORS}]},
    ]
  },
  {
    id:'automation',
    title:'Αυτοματισμοί',
    text:'Ροές, επιχειρησιακοί κανόνες και ειδοποιήσεις.',
    tools:[
      {id:'workflows',icon:Workflow,title:'Workflows',text:'Ροές εργασίας που συνδέουν καταστάσεις, ενέργειες και επόμενα βήματα.',note:'Ροές εργασίας',actions:[{label:'Άνοιγμα',path:APP_ROUTES.STUDIO_WORKFLOWS}]},
      {id:'rules',icon:BellRing,title:'Κανόνες & Ειδοποιήσεις',text:'Κανόνες λειτουργίας, triggers, προθεσμίες και ειδοποιήσεις σε μία ενιαία περιοχή.',note:'Trigger → Condition → Action',actions:[{label:'Κανόνες',path:APP_ROUTES.STUDIO_RULES},{label:'Ειδοποιήσεις',path:APP_ROUTES.STUDIO_NOTIFICATIONS}]},
    ]
  },
  {
    id:'advanced',
    title:'Προχωρημένα',
    text:'Ρυθμίσεις που αφορούν διαχειριστές και όχι την καθημερινή χρήση.',
    tools:[
      {id:'ai',icon:Bot,title:'AI / LIRA Ρυθμίσεις',text:'Παραμετροποίηση λειτουργιών AI, κανόνων χρήσης και σχετικών επιλογών.',note:'AI configuration',actions:[{label:'Άνοιγμα',path:APP_ROUTES.STUDIO_AI}]},
    ]
  },
]

export default function LimoxisStudioPage(){
  const navigate=useNavigate()
  const location=useLocation()
  const [search,setSearch]=useState('')
  const settingsOpen=location.pathname===APP_ROUTES.STUDIO_SETTINGS || location.pathname==='/settings'

  const visibleGroups=useMemo(()=>{
    const needle=search.trim().toLocaleLowerCase('el-GR')
    if(!needle) return GROUPS
    return GROUPS.map(group=>({
      ...group,
      tools:group.tools.filter(tool=>[group.title,tool.title,tool.text,tool.note].join(' ').toLocaleLowerCase('el-GR').includes(needle))
    })).filter(group=>group.tools.length)
  },[search])

  if(settingsOpen){
    return <PageChrome className="studio-settings-page" back={<BackLink onClick={()=>navigate(APP_ROUTES.STUDIO)}>Πίσω στο Κέντρο Διαχείρισης</BackLink>} header={<PageHeader eyebrow="ΚΕΝΤΡΟ ΔΙΑΧΕΙΡΙΣΗΣ" title="Βιβλιοθήκες & Ρυθμίσεις" description="Κεντρική παραμετροποίηση λιστών, πηγών δεδομένων και γενικών επιλογών της εφαρμογής." />}><SettingsPage embedded /></PageChrome>
  }

  return <PageChrome className="studio-page" header={<PageHeader eyebrow="HEALTHCARE SUITE" title="Κέντρο Διαχείρισης" description="Διαχείριση πρόσβασης, παραμετροποίηση, αυτοματισμοί και προηγμένες ρυθμίσεις του Healthcare Suite." />}>
    <div className="studio-toolbar" role="search">
      <Search size={17} aria-hidden="true"/>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Αναζήτηση στο Κέντρο Διαχείρισης…" aria-label="Αναζήτηση εργαλείου στο Κέντρο Διαχείρισης" />
      {search&&<button type="button" onClick={()=>setSearch('')}>Καθαρισμός</button>}
    </div>

    <div className="studio-groups">
      {visibleGroups.map(group=><section className="studio-group" key={group.id}>
        <div className="studio-group__header"><h2>{group.title}</h2><p>{group.text}</p></div>
        <div className="studio-grid">{group.tools.map(tool=><StudioToolCard key={tool.id} tool={tool} onOpen={path=>navigate(path)}/>)}</div>
      </section>)}
    </div>
    {visibleGroups.length===0&&<div className="studio-empty">Δεν βρέθηκε εργαλείο με αυτά τα κριτήρια.</div>}

    <p className="studio-admin-note">Το Developer Center παραμένει εκτός της καθημερινής διαχείρισης. Το Audit Trail θα ενεργοποιηθεί εδώ όταν συνδεθεί με πραγματική καταγραφή ενεργειών, ώστε να μην εμφανίζεται μη λειτουργικό εργαλείο.</p>
  </PageChrome>
}

function StudioToolCard({tool,onOpen}){
  const Icon=tool.icon
  const primary=tool.actions[0]
  return <article className="studio-card">
    <div className="studio-card__icon"><Icon size={22}/></div>
    <div className="studio-card__content"><span>{tool.note}</span><h3>{tool.title}</h3><p>{tool.text}</p></div>
    <div className="studio-card__actions">
      {tool.actions.map((action,index)=><Button key={action.path} variant={index===0?'secondary':'ghost'} onClick={()=>onOpen(action.path)}>{action.label}</Button>)}
    </div>
  </article>
}

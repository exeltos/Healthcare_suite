import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, FormInput, Library, Search, ShieldCheck, Users } from 'lucide-react'
import SettingsPage from '../SettingsPage'
import { BackLink, Button, PageChrome } from '../../components/core'
import PageHeader from '../../components/core/PageHeader/PageHeader'
import { APP_ROUTES } from '../../config/routes'
import { useI18n } from '../../i18n'
import './LimoxisStudioPage.css'

const GROUPS = [
  {
    id:'access',
    titleEl:'Διαχείριση πρόσβασης',
    titleEn:'Access Management',
    textEl:'Λογαριασμοί χρηστών, ρόλοι και δικαιώματα.',
    textEn:'User accounts, roles and permissions.',
    tools:[
      {id:'users',icon:Users,titleEl:'Χρήστες',titleEn:'Users',textEl:'Λογαριασμοί πρόσβασης, σύνδεση με το προσωπικό, τμήματα και πρόσθετες αρμοδιότητες.',textEn:'Access accounts linked to staff, departments and additional capabilities.',noteEl:'Λογαριασμοί',noteEn:'Accounts',actions:[{labelEl:'Άνοιγμα',labelEn:'Open',path:APP_ROUTES.STUDIO_USERS}]},
      {id:'roles',icon:ShieldCheck,titleEl:'Ρόλοι & Δικαιώματα',titleEn:'Roles & Permissions',textEl:'Ρόλοι και λειτουργικό scope πρόσβασης κάθε κατηγορίας χρήστη.',textEn:'Roles and functional access scope for each user category.',noteEl:'Πρόσβαση & ασφάλεια',noteEn:'Access & security',actions:[{labelEl:'Άνοιγμα',labelEn:'Open',path:APP_ROUTES.STUDIO_ROLES}]},
    ]
  },
  {
    id:'configuration',
    titleEl:'Παραμετροποίηση',
    titleEn:'Configuration',
    textEl:'Κεντρικά λεξικά, φόρμες και δείκτες που χρησιμοποιούνται σε όλη την εφαρμογή.',
    textEn:'Central dictionaries, forms and indicators used throughout the application.',
    tools:[
      {id:'libraries',icon:Library,titleEl:'Βιβλιοθήκες & Ρυθμίσεις',titleEn:'Libraries & Settings',textEl:'Τμήματα, μικροοργανισμοί, δείγματα, προϊόντα, επαγγελματικές κατηγορίες και γενική παραμετροποίηση.',textEn:'Departments, microorganisms, samples, products, professional categories and general configuration.',noteEl:'Κεντρικά δεδομένα',noteEn:'Master data',actions:[{labelEl:'Άνοιγμα',labelEn:'Open',path:APP_ROUTES.STUDIO_SETTINGS}]},
      {id:'forms',icon:FormInput,titleEl:'Smart Forms',titleEn:'Smart Forms',textEl:'Δημιουργία και διαχείριση bundles, audits, checklists και ερωτηματολογίων.',textEn:'Create and manage bundles, audits, checklists and questionnaires.',noteEl:'Form Designer',noteEn:'Form Designer',actions:[{labelEl:'Άνοιγμα',labelEn:'Open',path:APP_ROUTES.FORM_DESIGNER}]},
      {id:'indicators',icon:BarChart3,titleEl:'Δείκτες',titleEn:'Indicators',textEl:'Οι ίδιοι δείκτες της Κεντρικής εικόνας, με διαχείριση στόχων και παραμέτρων.',textEn:'The same indicators shown on the Dashboard, with target and parameter management.',noteEl:'KPI & παραμετροποίηση',noteEn:'KPI & configuration',actions:[{labelEl:'Άνοιγμα',labelEn:'Open',path:APP_ROUTES.STUDIO_INDICATORS}]},
    ]
  },
]

export default function LimoxisStudioPage(){
  const { language }=useI18n()
  const L=(el,en)=>language==='en'?en:el
  const navigate=useNavigate()
  const location=useLocation()
  const [search,setSearch]=useState('')
  const settingsOpen=location.pathname===APP_ROUTES.STUDIO_SETTINGS || location.pathname==='/settings'

  const visibleGroups=useMemo(()=>{
    const needle=search.trim().toLocaleLowerCase(language==='en'?'en':'el-GR')
    if(!needle) return GROUPS
    return GROUPS.map(group=>({
      ...group,
      tools:group.tools.filter(tool=>[
        language==='en'?group.titleEn:group.titleEl,
        language==='en'?tool.titleEn:tool.titleEl,
        language==='en'?tool.textEn:tool.textEl,
        language==='en'?tool.noteEn:tool.noteEl,
      ].join(' ').toLocaleLowerCase(language==='en'?'en':'el-GR').includes(needle))
    })).filter(group=>group.tools.length)
  },[search,language])

  if(settingsOpen){
    return <PageChrome
      className="studio-settings-page"
      back={<BackLink onClick={()=>navigate(APP_ROUTES.STUDIO)}>{L('Πίσω στο Κέντρο Διαχείρισης','Back to Management Center')}</BackLink>}
      header={<PageHeader
        eyebrow={L('ΚΕΝΤΡΟ ΔΙΑΧΕΙΡΙΣΗΣ','MANAGEMENT CENTER')}
        title={L('Βιβλιοθήκες & Ρυθμίσεις','Libraries & Settings')}
        description={L('Κεντρική παραμετροποίηση λιστών, πηγών δεδομένων και γενικών επιλογών της εφαρμογής.','Central configuration of lists, data sources and general application options.')}
      />}
    >
      <SettingsPage embedded />
    </PageChrome>
  }

  return <PageChrome
    className="studio-page"
    header={<PageHeader
      eyebrow="HEALTHCARE SUITE"
      title={L('Κέντρο Διαχείρισης','Management Center')}
      description={L('Διαχείριση πρόσβασης και των κεντρικών λειτουργικών ρυθμίσεων του Healthcare Suite.','Manage access and central operational configuration for Healthcare Suite.')}
    />}
  >
    <div className="studio-toolbar" role="search">
      <Search size={17} aria-hidden="true"/>
      <input
        value={search}
        onChange={e=>setSearch(e.target.value)}
        placeholder={L('Αναζήτηση στο Κέντρο Διαχείρισης…','Search Management Center…')}
        aria-label={L('Αναζήτηση εργαλείου στο Κέντρο Διαχείρισης','Search Management Center tool')}
      />
      {search&&<Button size="sm" variant="ghost" onClick={()=>setSearch('')}>{L('Καθαρισμός','Clear')}</Button>}
    </div>

    <div className="studio-groups">
      {visibleGroups.map(group=><section className="studio-group" key={group.id}>
        <div className="studio-group__header">
          <h2>{language==='en'?group.titleEn:group.titleEl}</h2>
          <p>{language==='en'?group.textEn:group.textEl}</p>
        </div>
        <div className="studio-grid">{group.tools.map(tool=><StudioToolCard key={tool.id} tool={tool} language={language} onOpen={path=>navigate(path)}/>)}</div>
      </section>)}
    </div>

    {visibleGroups.length===0&&<div className="studio-empty">{L('Δεν βρέθηκε εργαλείο με αυτά τα κριτήρια.','No tool matched these criteria.')}</div>}


  </PageChrome>
}

function StudioToolCard({tool,language,onOpen}){
  const Icon=tool.icon
  const action=tool.actions[0]
  return <article
    className="studio-card studio-card--clickable"
    role="button"
    tabIndex={0}
    onClick={()=>action&&onOpen(action.path)}
    onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&action){e.preventDefault();onOpen(action.path)}}}
    aria-label={`${language==='en'?'Open':'Άνοιγμα'} ${language==='en'?tool.titleEn:tool.titleEl}`}
  >
    <div className="studio-card__icon"><Icon size={22}/></div>
    <div className="studio-card__content">
      <span>{language==='en'?tool.noteEn:tool.noteEl}</span>
      <h3>{language==='en'?tool.titleEn:tool.titleEl}</h3>
      <p>{language==='en'?tool.textEn:tool.textEl}</p>
    </div>
  </article>
}

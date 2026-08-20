import { useEffect, useRef, useState } from 'react'
import { Accessibility, Building2, Check, ChevronDown, CircleHelp, Globe2, KeyRound, LogOut, Mail, Minus, Plus, RotateCcw, ShieldCheck, UserRound, X } from 'lucide-react'
import NotificationCenter from './NotificationCenter'
import LanguageSwitcher from '../core/LanguageSwitcher'
import Dialog from '../core/Dialog/Dialog'
import Button from '../core/Button/Button'
import IconButton from '../core/IconButton/IconButton'
import { useI18n } from '../../i18n'
import { loadCurrentProfile } from '../../services/profile'
import { readJsonObject, writeJson } from '../../core/storage'
import HelpCenter from '../help/HelpCenter'

const ACCESS_KEY='healthcare-suite.accessibility'
const defaults={textScale:1,highContrast:false,reducedMotion:false}
function loadAccess(){return {...defaults,...readJsonObject(ACCESS_KEY,{})}}
function applyAccess(value){
  document.documentElement.style.setProperty('--access-text-scale',String(value.textScale))
  document.documentElement.classList.toggle('access-high-contrast',value.highContrast)
  document.documentElement.classList.toggle('access-reduced-motion',value.reducedMotion)
  writeJson(ACCESS_KEY,value)
}

export default function Header({ navigationControl, onLogout, user }) {
  const { t, language } = useI18n()
  const [accessOpen,setAccessOpen]=useState(false),[userOpen,setUserOpen]=useState(false),[profileOpen,setProfileOpen]=useState(false),[logoutOpen,setLogoutOpen]=useState(false),[helpOpen,setHelpOpen]=useState(false),[access,setAccess]=useState(loadAccess)
  const accessRef=useRef(null), userRef=useRef(null)
  useEffect(()=>applyAccess(access),[access])
  useEffect(()=>{const close=e=>{if(!accessRef.current?.contains(e.target))setAccessOpen(false);if(!userRef.current?.contains(e.target))setUserOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[])
  const update=patch=>setAccess(v=>({...v,...patch}))
  const profile=loadCurrentProfile(language)
  const displayName=profile?.displayName||user?.name||t('common.administrator')
  const initials=(profile?.initials||user?.initials||'AD').slice(0,4)
  const role=profile?.roleLabel||(user?.demo?'Demo':t('common.administrator'))
  const L=(el,en)=>language==='en'?en:el
  return <>
    <header className="topbar">
      <div className="topbar-left">{navigationControl}<div className="suite-brand"><div className="suite-logo">H</div><div><strong>Healthcare Suite</strong><span>Clinical Quality &amp; Surveillance</span></div></div></div>
      <div className="topbar-actions">
        {user?.demo===true&&<span className="topbar-demo-badge">DEMO</span>}
        <LanguageSwitcher compact/><IconButton className="icon-button" label={L('Βοήθεια','Help')} onClick={()=>setHelpOpen(true)}><CircleHelp size={19}/></IconButton>
        <div className="header-popover-wrap" ref={accessRef}>
          <IconButton className="icon-button" label={t('common.accessibility')} onClick={()=>{setAccessOpen(v=>!v);setUserOpen(false)}}><Accessibility size={19}/></IconButton>
          {accessOpen&&<div className="header-popover accessibility-popover"><strong>{t('common.accessibility')}</strong><div className="access-row"><span>{t('common.textSize')}</span><div className="access-stepper"><IconButton size="sm" label="-" onClick={()=>update({textScale:Math.max(.9,+(access.textScale-.1).toFixed(1))})}><Minus size={15}/></IconButton><b>{Math.round(access.textScale*100)}%</b><IconButton size="sm" label="+" onClick={()=>update({textScale:Math.min(1.2,+(access.textScale+.1).toFixed(1))})}><Plus size={15}/></IconButton></div></div><Button variant="secondary" className="access-option" onClick={()=>update({highContrast:!access.highContrast})}>{t('common.highContrast')}{access.highContrast&&<Check size={16}/>}</Button><Button variant="secondary" className="access-option" onClick={()=>update({reducedMotion:!access.reducedMotion})}>{t('common.reducedMotion')}{access.reducedMotion&&<Check size={16}/>}</Button><Button variant="secondary" size="sm" className="access-reset" icon={<RotateCcw size={15}/>} onClick={()=>setAccess(defaults)}>{t('common.reset')}</Button></div>}
        </div>
        <NotificationCenter/>
        <div className="header-popover-wrap" ref={userRef}><Button variant="secondary" className="user-profile user-profile-button user-profile-button--compact" aria-label={L('Λογαριασμός χρήστη','User account')} title={displayName} onClick={()=>{setUserOpen(v=>!v);setAccessOpen(false)}} aria-expanded={userOpen}><div className="avatar">{initials}</div><ChevronDown size={14}/></Button>{userOpen&&<div className="header-popover user-popover"><Button variant="secondary" size="sm" icon={<UserRound size={16}/>} onClick={()=>{setUserOpen(false);setProfileOpen(true)}}>{t('common.profile')}</Button><Button variant="secondary" size="sm" className="logout-menu-item" icon={<LogOut size={16}/>} onClick={()=>{setUserOpen(false);setLogoutOpen(true)}}>{t('common.logout')}</Button></div>}</div>
      </div>
    </header>
    {profileOpen&&<div className="profile-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setProfileOpen(false)}}>
      <aside className="profile-drawer" role="dialog" aria-modal="true" aria-label={t('common.profile')}>
        <header className="profile-drawer__header">
          <div className="profile-drawer__identity"><div className="profile-drawer__avatar">{initials}</div><div><span className="profile-drawer__eyebrow">{profile?.demo?'DEMO':L('ΠΡΟΦΙΛ ΧΡΗΣΤΗ','USER PROFILE')}</span><h2>{displayName}</h2><p>{role}</p></div></div>
          <IconButton className="icon-button" label={L('Κλείσιμο','Close')} onClick={()=>setProfileOpen(false)}><X size={19}/></IconButton>
        </header>
        {profile?.demo&&<div className="profile-demo-note"><ShieldCheck size={18}/><div><strong>{L('Περιβάλλον επίδειξης','Demo environment')}</strong><span>{L('Ο λογαριασμός χρησιμοποιεί μόνο δοκιμαστικά δεδομένα και δεν αποτελεί πραγματικό λογαριασμό προσωπικού.','This account uses demo data only and is not a real staff account.')}</span></div></div>}
        <div className="profile-drawer__body">
          <section className="profile-section"><h3>{L('Στοιχεία λογαριασμού','Account details')}</h3>
            <ProfileRow icon={<UserRound size={17}/>} label={L('Όνομα χρήστη','Username')} value={profile?.username||'—'}/>
            <ProfileRow icon={<Mail size={17}/>} label="Email" value={profile?.email||'—'}/>
            <ProfileRow icon={<UserRound size={17}/>} label={L('Ιδιότητα','Professional category')} value={profile?.professionalCategory||'—'}/>
            <ProfileRow icon={<Building2 size={17}/>} label={L('Βασικό τμήμα','Primary department')} value={profile?.department||'—'}/>
          </section>
          <section className="profile-section"><h3>{L('Πρόσβαση','Access')}</h3>
            <ProfileRow icon={<ShieldCheck size={17}/>} label={L('Βασικός ρόλος','Base role')} value={role}/>
            <ProfileRow icon={<Building2 size={17}/>} label={L('Πρόσβαση σε τμήματα','Department access')} value={profile?.scopeLabel||'—'}/>
            <div className="profile-capabilities"><span>{L('Πρόσθετες αρμοδιότητες','Additional capabilities')}</span>{profile?.capabilityLabels?.length?<div>{profile.capabilityLabels.map(item=><b key={item}>{item}</b>)}</div>:<em>{L('Καμία πρόσθετη αρμοδιότητα','No additional capabilities')}</em>}</div>
          </section>
          <section className="profile-section"><h3>{L('Προτιμήσεις','Preferences')}</h3>
            <ProfileRow icon={<Globe2 size={17}/>} label={L('Γλώσσα εφαρμογής','Application language')} value={profile?.languageLabel||'—'}/>
          </section>
          {!profile?.demo&&<div className="profile-readonly-note"><KeyRound size={16}/><span>{L('Ρόλος, τμήμα και δικαιώματα διαχειρίζονται από το Κέντρο Διαχείρισης. Η αλλαγή κωδικού θα ενεργοποιηθεί με την παραγωγική υπηρεσία ταυτοποίησης.','Role, department and permissions are managed from the Management Center. Password change will be enabled with the production authentication service.')}</span></div>}
        </div>
      </aside>
    </div>}
    <HelpCenter open={helpOpen} onClose={()=>setHelpOpen(false)}/>
    <Dialog open={logoutOpen} onClose={()=>setLogoutOpen(false)} onConfirm={()=>{setLogoutOpen(false);onLogout?.()}} title={t('common.confirmSignOut')} description={t('common.signOutQuestion')} confirmLabel={t('common.logout')} cancelLabel={t('common.cancel')} variant="warning"/>
  </>
}

function ProfileRow({icon,label,value}){return <div className="profile-row"><span className="profile-row__icon">{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>}

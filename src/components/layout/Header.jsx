import { useEffect, useRef, useState } from 'react'
import { Accessibility, Building2, Check, ChevronDown, Globe2, KeyRound, LogOut, Mail, Minus, Plus, RotateCcw, ShieldCheck, UserRound, X } from 'lucide-react'
import NotificationCenter from './NotificationCenter'
import LanguageSwitcher from '../core/LanguageSwitcher'
import Dialog from '../core/Dialog/Dialog'
import { useI18n } from '../../i18n'
import { loadCurrentProfile } from '../../services/profile'
import { readJsonObject, writeJson } from '../../core/storage'

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
  const [accessOpen,setAccessOpen]=useState(false),[userOpen,setUserOpen]=useState(false),[profileOpen,setProfileOpen]=useState(false),[logoutOpen,setLogoutOpen]=useState(false),[access,setAccess]=useState(loadAccess)
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
      <div className="topbar-left">{navigationControl}<div className="suite-brand"><div className="suite-logo">H</div><div><strong>Healthcare Suite</strong><span>Limoxis Observer</span></div></div></div>
      <div className="topbar-actions">
        <LanguageSwitcher compact/>
        <div className="header-popover-wrap" ref={accessRef}>
          <button className="icon-button" type="button" aria-label={t('common.accessibility')} title={t('common.accessibility')} onClick={()=>{setAccessOpen(v=>!v);setUserOpen(false)}}><Accessibility size={19}/></button>
          {accessOpen&&<div className="header-popover accessibility-popover"><strong>{t('common.accessibility')}</strong><div className="access-row"><span>{t('common.textSize')}</span><div className="access-stepper"><button type="button" aria-label="-" onClick={()=>update({textScale:Math.max(.9,+(access.textScale-.1).toFixed(1))})}><Minus size={15}/></button><b>{Math.round(access.textScale*100)}%</b><button type="button" aria-label="+" onClick={()=>update({textScale:Math.min(1.2,+(access.textScale+.1).toFixed(1))})}><Plus size={15}/></button></div></div><button type="button" className="access-option" onClick={()=>update({highContrast:!access.highContrast})}><span>{t('common.highContrast')}</span>{access.highContrast&&<Check size={16}/>}</button><button type="button" className="access-option" onClick={()=>update({reducedMotion:!access.reducedMotion})}><span>{t('common.reducedMotion')}</span>{access.reducedMotion&&<Check size={16}/>}</button><button type="button" className="access-reset" onClick={()=>setAccess(defaults)}><RotateCcw size={15}/>{t('common.reset')}</button></div>}
        </div>
        <NotificationCenter/>
        <div className="header-popover-wrap" ref={userRef}><button type="button" className="user-profile user-profile-button" onClick={()=>{setUserOpen(v=>!v);setAccessOpen(false)}} aria-expanded={userOpen}><div className="avatar">{initials}</div><div className="user-copy"><strong>{displayName}</strong><span>{role}</span></div><ChevronDown size={15}/></button>{userOpen&&<div className="header-popover user-popover"><button type="button" onClick={()=>{setUserOpen(false);setProfileOpen(true)}}><UserRound size={16}/>{t('common.profile')}</button><button type="button" className="logout-menu-item" onClick={()=>{setUserOpen(false);setLogoutOpen(true)}}><LogOut size={16}/>{t('common.logout')}</button></div>}</div>
      </div>
    </header>
    {profileOpen&&<div className="profile-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setProfileOpen(false)}}>
      <aside className="profile-drawer" role="dialog" aria-modal="true" aria-label={t('common.profile')}>
        <header className="profile-drawer__header">
          <div className="profile-drawer__identity"><div className="profile-drawer__avatar">{initials}</div><div><span className="profile-drawer__eyebrow">{profile?.demo?'DEMO':L('ΠΡΟΦΙΛ ΧΡΗΣΤΗ','USER PROFILE')}</span><h2>{displayName}</h2><p>{role}</p></div></div>
          <button type="button" className="icon-button" onClick={()=>setProfileOpen(false)} aria-label={L('Κλείσιμο','Close')}><X size={19}/></button>
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
    <Dialog open={logoutOpen} onClose={()=>setLogoutOpen(false)} onConfirm={()=>{setLogoutOpen(false);onLogout?.()}} title={t('common.confirmSignOut')} description={t('common.signOutQuestion')} confirmLabel={t('common.logout')} cancelLabel={t('common.cancel')} variant="warning"/>
  </>
}

function ProfileRow({icon,label,value}){return <div className="profile-row"><span className="profile-row__icon">{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>}

import { useEffect, useRef, useState } from 'react'
import { Accessibility, Check, ChevronDown, LogOut, Minus, Plus, RotateCcw, UserRound } from 'lucide-react'
import NotificationCenter from './NotificationCenter'
import LanguageSwitcher from '../core/LanguageSwitcher'
import Dialog from '../core/Dialog/Dialog'
import { useI18n } from '../../i18n'
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
  const { t } = useI18n()
  const [accessOpen,setAccessOpen]=useState(false),[userOpen,setUserOpen]=useState(false),[logoutOpen,setLogoutOpen]=useState(false),[access,setAccess]=useState(loadAccess)
  const accessRef=useRef(null), userRef=useRef(null)
  useEffect(()=>applyAccess(access),[access])
  useEffect(()=>{const close=e=>{if(!accessRef.current?.contains(e.target))setAccessOpen(false);if(!userRef.current?.contains(e.target))setUserOpen(false)};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close)},[])
  const update=patch=>setAccess(v=>({...v,...patch}))
  const displayName=user?.name||t('common.administrator'), initials=(user?.initials||'AD').slice(0,4), role=t('common.administrator')
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
        <div className="header-popover-wrap" ref={userRef}><button type="button" className="user-profile user-profile-button" onClick={()=>{setUserOpen(v=>!v);setAccessOpen(false)}} aria-expanded={userOpen}><div className="avatar">{initials}</div><div className="user-copy"><strong>{displayName}</strong><span>{role}</span></div><ChevronDown size={15}/></button>{userOpen&&<div className="header-popover user-popover"><button type="button"><UserRound size={16}/>{t('common.profile')}</button><button type="button" className="logout-menu-item" onClick={()=>{setUserOpen(false);setLogoutOpen(true)}}><LogOut size={16}/>{t('common.logout')}</button></div>}</div>
      </div>
    </header>
    <Dialog open={logoutOpen} onClose={()=>setLogoutOpen(false)} onConfirm={()=>{setLogoutOpen(false);onLogout?.()}} title={t('common.confirmSignOut')} description={t('common.signOutQuestion')} confirmLabel={t('common.logout')} cancelLabel={t('common.cancel')} variant="warning"/>
  </>
}

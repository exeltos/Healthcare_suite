import { Menu } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import NewEntryLauncher from '../launcher/NewEntryLauncher'
import { useI18n } from '../../i18n'
import { readSessionValue, removeSessionValue } from '../../core/storage'

const SESSION_KEY='healthcare-suite.session'
export default function AppLayout() {
  const { t, language } = useI18n(); const navigate=useNavigate()
  let user=null; try{user=JSON.parse(readSessionValue('healthcare-suite.user')||'null')}catch{}
  const [collapsed,setCollapsed]=useState(false),[mobileOpen,setMobileOpen]=useState(false),[launcherOpen,setLauncherOpen]=useState(false),[launcherInitialType,setLauncherInitialType]=useState(''),[goodbye,setGoodbye]=useState(false)
  if(readSessionValue(SESSION_KEY)!=='active'&&!goodbye) return <Navigate to="/login" replace/>
  const openNewEntryLauncher=useCallback((initialTypeId='')=>{setLauncherInitialType(initialTypeId);setLauncherOpen(true)},[])
  const closeNewEntryLauncher=useCallback(()=>{setLauncherOpen(false);setLauncherInitialType('')},[])
  const toggleNavigation=useCallback(()=>{const isMobile=typeof window!=='undefined'&&window.matchMedia('(max-width: 760px)').matches;if(isMobile){setMobileOpen(v=>!v);return}setCollapsed(v=>!v)},[])
  function logout(){removeSessionValue(SESSION_KEY);removeSessionValue('healthcare-suite.user');setGoodbye(true);setTimeout(()=>navigate('/login',{replace:true,state:{signedOut:true}}),900)}
  if(goodbye)return <div className="logout-goodbye"><div><div className="suite-logo">H</div><h2>{t('common.signedOutTitle')}</h2><p>{t('common.signedOutText')}</p></div></div>
  return <div className={`app-shell ${collapsed?'sidebar-collapsed':''}`}><Header user={user} onLogout={logout} navigationControl={<button type="button" className="icon-button app-navigation-toggle" onClick={toggleNavigation} aria-label={t('common.navigationToggle')} title={t('common.menu')}><Menu size={19}/></button>}/><div className="app-main"><Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={()=>setMobileOpen(false)}/><main className="content-area"><Outlet context={{openNewEntryLauncher}}/></main></div><Footer/><NewEntryLauncher open={launcherOpen} onClose={closeNewEntryLauncher} initialTypeId={launcherInitialType}/></div>
}

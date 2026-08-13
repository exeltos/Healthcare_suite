import { APP_ROUTES } from '../../config/routes'
import { Menu } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import NewEntryLauncher from '../launcher/NewEntryLauncher'
import { useI18n } from '../../i18n'
import { readSessionValue, removeSessionValue } from '../../core/storage'
import { isSessionAllowed, signOutUser, validateProductionSession } from '../../services/auth'
import { IS_PRODUCTION } from '../../core/runtime'
import { writeSessionValue } from '../../core/storage'
import { canViewModule, moduleForPath } from '../../services/accessControlService'

const SESSION_KEY='healthcare-suite.session'
export default function AppLayout() {
  const { t, language } = useI18n(); const navigate=useNavigate(); const location=useLocation()
  let cachedUser=null; try{cachedUser=JSON.parse(readSessionValue('healthcare-suite.user')||'null')}catch{}
  const [user,setUser]=useState(cachedUser)
  const [authState,setAuthState]=useState(IS_PRODUCTION?'checking':'ready')
  const [collapsed,setCollapsed]=useState(false),[mobileOpen,setMobileOpen]=useState(false),[launcherOpen,setLauncherOpen]=useState(false),[launcherInitialType,setLauncherInitialType]=useState(''),[goodbye,setGoodbye]=useState(false)

  useEffect(()=>{
    let cancelled=false
    if(!IS_PRODUCTION) return undefined
    validateProductionSession()
      .then(result=>{
        if(cancelled)return
        if(result.valid&&result.user){
          writeSessionValue(SESSION_KEY,'active')
          writeSessionValue('healthcare-suite.user',JSON.stringify(result.user))
          setUser(result.user)
          setAuthState('ready')
        }else{
          removeSessionValue(SESSION_KEY)
          removeSessionValue('healthcare-suite.user')
          setUser(null)
          setAuthState('invalid')
        }
      })
      .catch(()=>{
        if(cancelled)return
        removeSessionValue(SESSION_KEY)
        removeSessionValue('healthcare-suite.user')
        setUser(null)
        setAuthState('invalid')
      })
    return()=>{cancelled=true}
  },[])

  const session=readSessionValue(SESSION_KEY)
  if(authState==='checking') return <div className="app-auth-loading"><div className="suite-logo">H</div><span>{t('common.loading')}</span></div>
  if((authState==='invalid'||!isSessionAllowed({session,user}))&&!goodbye) return <Navigate to="/login" replace/>
  const currentModule=moduleForPath(location.pathname)
  const helpPreview=new URLSearchParams(location.search).get('helpPreview')==='1'
  if(user && user.demo!==true && !canViewModule(user,currentModule) && location.pathname!==APP_ROUTES.DASHBOARD) return <Navigate to={APP_ROUTES.DASHBOARD} replace state={{accessDenied:true}}/>
  const openNewEntryLauncher=useCallback((initialTypeId='')=>{setLauncherInitialType(initialTypeId);setLauncherOpen(true)},[])
  const closeNewEntryLauncher=useCallback(()=>{setLauncherOpen(false);setLauncherInitialType('')},[])
  const toggleNavigation=useCallback(()=>{const isMobile=typeof window!=='undefined'&&window.matchMedia('(max-width: 760px)').matches;if(isMobile){setMobileOpen(v=>!v);return}setCollapsed(v=>!v)},[])
  async function logout(){
    try{await signOutUser()}catch{}
    removeSessionValue(SESSION_KEY)
    removeSessionValue('healthcare-suite.user')
    setUser(null)
    setGoodbye(true)
    setTimeout(()=>navigate(APP_ROUTES.LOGIN,{replace:true,state:{signedOut:true}}),900)
  }
  if(goodbye)return <div className="logout-goodbye"><div><div className="suite-logo">H</div><h2>{t('common.signedOutTitle')}</h2><p>{t('common.signedOutText')}</p></div></div>
  if(helpPreview)return <div className="help-preview-shell"><main className="content-area help-preview-content"><Outlet context={{openNewEntryLauncher:()=>{}}}/></main></div>
  return <div className={`app-shell ${collapsed?'sidebar-collapsed':''}`}><Sidebar user={user} collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={()=>setMobileOpen(false)}/><Header user={user} onLogout={logout} navigationControl={<button type="button" className="icon-button app-navigation-toggle" onClick={toggleNavigation} aria-label={t('common.navigationToggle')} title={t('common.menu')}><Menu size={19}/></button>}/><main className="content-area"><Outlet context={{openNewEntryLauncher}}/></main><Footer/><NewEntryLauncher open={launcherOpen} onClose={closeNewEntryLauncher} initialTypeId={launcherInitialType}/></div>
}

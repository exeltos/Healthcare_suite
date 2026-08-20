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
import { DEMO_RUNTIME_KEY, IS_PRODUCTION, SESSION_IDLE_MS } from '../../core/runtime'
import { isSupabaseConfigured, requireSupabase } from '../../integrations/supabase'
import { writeSessionValue } from '../../core/storage'
import { canViewModule, moduleForPath } from '../../services/accessControlService'
import { hydrateProductionOperationalMirrors } from '../../services/backend/productionHydrationService'

const SESSION_KEY='healthcare-suite.session'
export default function AppLayout() {
  const { t, language } = useI18n(); const navigate=useNavigate(); const location=useLocation()
  let cachedUser=null; try{cachedUser=JSON.parse(readSessionValue('healthcare-suite.user')||'null')}catch{}
  const [user,setUser]=useState(cachedUser)
  const [authState,setAuthState]=useState(IS_PRODUCTION?'checking':'ready')
  const [dataState,setDataState]=useState(IS_PRODUCTION?'waiting':'ready')
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

  useEffect(()=>{
    let cancelled=false
    if(!IS_PRODUCTION||authState!=='ready'||!user||user.demo===true){setDataState('ready');return undefined}
    setDataState('loading')
    hydrateProductionOperationalMirrors()
      .then(()=>{if(!cancelled)setDataState('ready')})
      .catch(error=>{console.error('Production data hydration failed',error);if(!cancelled)setDataState('ready')})
    return()=>{cancelled=true}
  },[authState,user?.id])

  // Keep the UI in sync with provider-side sign-out/session expiry.
  useEffect(()=>{
    if(!IS_PRODUCTION || !isSupabaseConfigured) return undefined
    const client=requireSupabase()
    const {data}=client.auth.onAuthStateChange((event)=>{
      if(['SIGNED_OUT','USER_DELETED'].includes(event)){
        removeSessionValue(SESSION_KEY)
        removeSessionValue('healthcare-suite.user')
        setUser(null)
        setAuthState('invalid')
      }
    })
    return()=>data?.subscription?.unsubscribe?.()
  },[])

  // Idle timeout is intentionally invisible during normal work. User activity
  // refreshes the timer; inactivity signs out both the provider and local shell.
  useEffect(()=>{
    if(!IS_PRODUCTION || authState!=='ready') return undefined
    let timer
    const expire=async()=>{
      try{await signOutUser()}catch{}
      removeSessionValue(SESSION_KEY)
      removeSessionValue('healthcare-suite.user')
      setUser(null)
      setAuthState('invalid')
    }
    const reset=()=>{
      clearTimeout(timer)
      timer=setTimeout(expire,SESSION_IDLE_MS)
    }
    const events=['pointerdown','keydown','touchstart','scroll']
    events.forEach(name=>window.addEventListener(name,reset,{passive:true}))
    reset()
    return()=>{
      clearTimeout(timer)
      events.forEach(name=>window.removeEventListener(name,reset))
    }
  },[authState])

  // Hooks must always run in the same order. These callbacks intentionally live
  // before every conditional return; otherwise the initial auth-loading render
  // skips them and the authenticated render triggers React invariant #310.
  const openNewEntryLauncher=useCallback((initialTypeId='')=>{setLauncherInitialType(initialTypeId);setLauncherOpen(true)},[])
  const closeNewEntryLauncher=useCallback(()=>{setLauncherOpen(false);setLauncherInitialType('')},[])
  const toggleNavigation=useCallback(()=>{const isMobile=typeof window!=='undefined'&&window.matchMedia('(max-width: 760px)').matches;if(isMobile){setMobileOpen(v=>!v);return}setCollapsed(v=>!v)},[])

  const session=readSessionValue(SESSION_KEY)
  if(authState==='checking'||dataState==='loading') return <div className="app-auth-loading"><div className="suite-logo">H</div><span>{t('common.loading')}</span></div>
  if((authState==='invalid'||!isSessionAllowed({session,user}))&&!goodbye) return <Navigate to="/login" replace/>
  const currentModule=moduleForPath(location.pathname)
  const helpPreview=new URLSearchParams(location.search).get('helpPreview')==='1'
  if(user && user.demo!==true && !canViewModule(user,currentModule) && location.pathname!==APP_ROUTES.DASHBOARD) return <Navigate to={APP_ROUTES.DASHBOARD} replace state={{accessDenied:true}}/>
  async function logout(){
    const leavingDemo=user?.demo===true
    try{await signOutUser()}catch{}
    removeSessionValue(SESSION_KEY)
    removeSessionValue('healthcare-suite.user')
    removeSessionValue('healthcare-suite.demo')
    if(leavingDemo) removeSessionValue(DEMO_RUNTIME_KEY)
    setUser(null)
    setGoodbye(true)
    setTimeout(()=>{
      if(leavingDemo){window.location.assign(APP_ROUTES.LOGIN);return}
      navigate(APP_ROUTES.LOGIN,{replace:true,state:{signedOut:true}})
    },900)
  }
  if(goodbye)return <div className="logout-goodbye"><div><div className="suite-logo">H</div><h2>{t('common.signedOutTitle')}</h2><p>{t('common.signedOutText')}</p></div></div>
  if(helpPreview)return <div className="help-preview-shell"><main className="content-area help-preview-content"><Outlet context={{openNewEntryLauncher:()=>{}}}/></main></div>
  return <div className={`app-shell ${collapsed?'sidebar-collapsed':''}`}><Sidebar user={user} collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={()=>setMobileOpen(false)}/><Header user={user} onLogout={logout} navigationControl={<button type="button" className="icon-button app-navigation-toggle" onClick={toggleNavigation} aria-label={t('common.navigationToggle')} title={t('common.menu')}><Menu size={19}/></button>}/><main className="content-area"><Outlet context={{openNewEntryLauncher}}/></main><Footer/><NewEntryLauncher open={launcherOpen} onClose={closeNewEntryLauncher} initialTypeId={launcherInitialType}/></div>
}

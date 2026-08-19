import { notifyAction } from '../../components/core/feedback/index'
import { useState } from 'react'
import { Languages } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../config/routes'
import { useI18n } from '../../i18n'
import './LoginPage.css'
import { removeSessionValue, writeSessionValue } from '../../core/storage'
import { generateDemoDataset } from '../../data/demoDataGenerator'
import { clearProductionLocalOperationalCache } from '../../data/productionDataBoundary'
import { authenticateUser, requestRecovery } from '../../services/auth'
import { IS_DEMO, IS_PRODUCTION } from '../../core/runtime'

const BUILD_VERSION = '0.12.0-rc.120'

export default function LoginPage() {
  const [view, setView] = useState('welcome')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const { t, language, setLanguage } = useI18n()

  function enterDemo() {
    if(!IS_DEMO) {
      setMessage(t('login.demoDisabledProduction'))
      setView('login')
      return
    }
    clearProductionLocalOperationalCache()
    generateDemoDataset()
    writeSessionValue('healthcare-suite.session','active')
    writeSessionValue('healthcare-suite.demo','true')
    writeSessionValue('healthcare-suite.user', JSON.stringify({ name: t('login.demoUser'), initials: 'DEMO', role: 'administrator', demo: true, authSource: 'demo-entry' }))
    navigate(APP_ROUTES.DASHBOARD, { replace: true })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    const form = new FormData(event.currentTarget)
    const username = String(form.get('username') || '').trim()
    const password = String(form.get('password') || '').trim()
    if (!username || !password) { setMessage(t('login.missingCredentials')); return }
    try {
      const authenticated = await authenticateUser({ username, password })
      // A normal sign-in must always start from a clean operational workspace.
      // Reference/master libraries are intentionally preserved.
      clearProductionLocalOperationalCache()
      removeSessionValue('healthcare-suite.demo')
      writeSessionValue('healthcare-suite.session',authenticated.session)
      writeSessionValue('healthcare-suite.user', JSON.stringify(authenticated.user))
      navigate(authenticated.user?.platformOwner?APP_ROUTES.PLATFORM:APP_ROUTES.DASHBOARD, { replace: true })
    } catch (error) {
      if(error?.code==='AUTH_NOT_CONFIGURED') {
        setMessage(t('login.productionAuthRequired'))
        return
      }
      if(error?.code==='EMAIL_REQUIRED') {
        setMessage(t('login.productionEmailRequired'))
        return
      }
      if(IS_PRODUCTION&&error?.message){
        setMessage(error.message)
        return
      }
      setMessage(t('login.invalidCredentials'))
    }
  }

  async function handleRecoverySubmit(event) {
    event.preventDefault()
    setMessage('')
    const form = new FormData(event.currentTarget)
    const recoveryEmail = String(form.get('recoveryEmail') || '').trim()

    if (!recoveryEmail) {
      setMessage(IS_PRODUCTION ? t('login.productionEmailRequired') : t('login.missingCredentials'))
      return
    }

    try {
      await requestRecovery({ username: recoveryEmail })
      setMessage(IS_PRODUCTION ? t('login.recoverySentProduction') : t('login.recoverySentDemo'))
    } catch (error) {
      if (error?.code === 'AUTH_NOT_CONFIGURED') {
        setMessage(t('login.productionRecoveryRequired'))
        return
      }
      if (error?.code === 'EMAIL_REQUIRED') {
        setMessage(t('login.productionEmailRequired'))
        return
      }
      if (error?.code === 'RECOVERY_RATE_LIMIT') {
        setMessage(t('login.recoveryRateLimit'))
        return
      }
      if (IS_PRODUCTION && error?.message) {
        setMessage(error.message)
        return
      }
      setMessage(t('login.productionRecoveryRequired'))
    }
  }

  return (
    <main className="login-page-shell">
      <section className="login-main-card"><div className="login-index-language">
        <button type="button" onClick={() => setLanguage(language === 'el' ? 'en' : 'el')} aria-label={`${t('common.language')}: ${language === 'el' ? 'EN' : 'EL'}`} title={`${t('common.language')}: ${language === 'el' ? 'EN' : 'EL'}`}>
          <Languages size={16}/><span>{language === 'el' ? 'EN' : 'EL'}</span>
        </button>
      </div>
        <aside className="login-visual-panel">
          <header className="login-brand"><div className="login-brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v18"/><path d="M3 12h18"/><circle cx="12" cy="12" r="8.5"/></svg></div><div className="login-brand-copy"><strong>HEALTHCARE SUITE</strong><span>Clinical Operations Platform</span></div></header>
          <div className="login-welcome-content">
            <div className="login-eyebrow"><span className="login-eyebrow-dot"/>{t('login.eyebrow')}</div>
            <h1>{t('login.heroTitle')}</h1><p>{t('login.heroText')}</p>
            <ul className="login-feature-list"><li><span>✓</span>{t('login.infectionSurveillance')}</li><li><span>✓</span>{t('login.sampleManagement')}</li><li><span>✓</span>{t('login.automaticIndicators')}</li><li><span>✓</span>{t('login.reportsAi')}</li></ul>
          </div>
          <footer className="login-visual-footer"><span>Healthcare Suite Platform · v{BUILD_VERSION}</span><span>{t('login.secureEnvironment')}</span></footer>
        </aside>
        <section className="login-auth-panel"><div className="login-auth-wrapper">
          <div className="login-language-row" aria-hidden="true"/>
          {view === 'welcome' ? (
            <section className="login-auth-view"><header className="login-auth-header"><h2>{t('login.welcome')}</h2><p>{t('login.welcomeText')}</p></header>
              <div className="login-welcome-actions"><button type="button" className="login-primary-button" onClick={() => setView('login')}>{t('login.enter')}</button>{IS_DEMO&&<button type="button" className="login-demo-button" onClick={enterDemo}>{t('login.demoEnter')}</button>}<button type="button" className="login-secondary-button" onClick={() => notifyAction(t('login.supportLater'))}>{t('login.support')}</button></div>
              <div className={`login-system-status ${IS_PRODUCTION?'is-production':''}`}><span className="login-status-dot"/>{IS_PRODUCTION?t('login.productionMode'):t('login.demoMode')}</div><footer className="login-auth-footer">Healthcare Suite · v{BUILD_VERSION}</footer>
            </section>
          ) : view === 'login' ? (
            <section className="login-auth-view"><button type="button" className="login-back-button" onClick={() => setView('welcome')}>{t('login.back')}</button><header className="login-auth-header"><h2>{t('login.signInTitle')}</h2><p>{t('login.signInText')}</p></header>
              <form className="login-form-grid" onSubmit={handleSubmit}><label className="login-form-group"><span>{IS_PRODUCTION?t('login.email'):t('login.username')}</span><input name="username" type={IS_PRODUCTION?'email':'text'} autoComplete={IS_PRODUCTION?'email':'username'}/></label><label className="login-form-group"><span>{t('login.password')}</span><div className="login-input-wrapper"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"/><button type="button" aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')} onClick={() => setShowPassword(v => !v)}>{showPassword ? '🙈' : '👁'}</button></div></label>{message && <div className="login-form-message">{message}</div>}<button type="button" className="login-forgot-link" onClick={() => { setMessage(''); setView('forgot') }}>{t('login.forgotPassword')}</button><button className="login-primary-button" type="submit">{t('login.signIn')}</button></form>
            </section>
          ) : (
            <section className="login-auth-view"><button type="button" className="login-back-button" onClick={() => { setMessage(''); setView('login') }}>{t('login.back')}</button><header className="login-auth-header"><h2>{t('login.forgotTitle')}</h2><p>{t('login.forgotText')}</p></header><form className="login-form-grid" onSubmit={handleRecoverySubmit}><label className="login-form-group"><span>{IS_PRODUCTION?t('login.email'):t('login.username')}</span><input required name="recoveryEmail" type={IS_PRODUCTION?'email':'text'} autoComplete={IS_PRODUCTION?'email':'username'}/></label>{message&&<div className="login-form-message">{message}</div>}<button className="login-primary-button" type="submit">{t('login.sendRecovery')}</button></form></section>
          )}
        </div></section>
      </section>
    </main>
  )
}

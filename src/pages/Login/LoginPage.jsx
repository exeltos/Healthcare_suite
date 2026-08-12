import { notifyAction } from '../../components/core/feedback/index'
import LanguageSwitcher from '../../components/core/LanguageSwitcher'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_ROUTES } from '../../config/routes'
import { useI18n } from '../../i18n'
import './LoginPage.css'
import { removeSessionValue, writeSessionValue } from '../../core/storage'
import { clearDemoDataset, generateDemoDataset } from '../../data/demoDataGenerator'

export default function LoginPage() {
  const [view, setView] = useState('welcome')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const { t } = useI18n()

  function enterDemo() {
    generateDemoDataset()
    writeSessionValue('healthcare-suite.session','active')
    writeSessionValue('healthcare-suite.demo','true')
    writeSessionValue('healthcare-suite.user', JSON.stringify({ name: t('login.demoUser'), initials: 'DEMO', role: 'administrator', demo: true }))
    navigate(APP_ROUTES.DASHBOARD, { replace: true })
  }

  function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const username = String(form.get('username') || '').trim()
    const password = String(form.get('password') || '').trim()
    if (!username || !password) { setMessage(t('login.missingCredentials')); return }
    clearDemoDataset()
    removeSessionValue('healthcare-suite.demo')
    writeSessionValue('healthcare-suite.session','active')
    writeSessionValue('healthcare-suite.user', JSON.stringify({ name: username, initials: username.slice(0,2).toUpperCase(), role: 'administrator', demo: false }))
    navigate(APP_ROUTES.DASHBOARD, { replace: true })
  }

  return (
    <main className="login-page-shell">
      <section className="login-main-card">
        <aside className="login-visual-panel">
          <header className="login-brand"><div className="login-brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v18"/><path d="M3 12h18"/><circle cx="12" cy="12" r="8.5"/></svg></div><div className="login-brand-copy"><strong>HEALTHCARE SUITE</strong><span>Clinical Operations Platform</span></div></header>
          <div className="login-welcome-content">
            <div className="login-eyebrow"><span className="login-eyebrow-dot"/>{t('login.eyebrow')}</div>
            <h1>{t('login.heroTitle')}</h1><p>{t('login.heroText')}</p>
            <ul className="login-feature-list"><li><span>✓</span>{t('login.infectionSurveillance')}</li><li><span>✓</span>{t('login.sampleManagement')}</li><li><span>✓</span>{t('login.automaticIndicators')}</li><li><span>✓</span>{t('login.reportsAi')}</li></ul>
          </div>
          <footer className="login-visual-footer"><span>Healthcare Suite Platform</span><span>{t('login.secureEnvironment')}</span></footer>
        </aside>
        <section className="login-auth-panel"><div className="login-auth-wrapper">
          <div className="login-language-row"><LanguageSwitcher /></div>
          {view === 'welcome' ? (
            <section className="login-auth-view"><header className="login-auth-header"><h2>{t('login.welcome')}</h2><p>{t('login.welcomeText')}</p></header>
              <div className="login-welcome-actions"><button type="button" className="login-primary-button" onClick={() => setView('login')}>{t('login.enter')}</button><button type="button" className="login-demo-button" onClick={enterDemo}>{t('login.demoEnter')}</button><button type="button" className="login-secondary-button" onClick={() => notifyAction(t('login.supportLater'))}>{t('login.support')}</button></div>
              <div className="login-system-status"><span className="login-status-dot"/>{t('login.available')}</div><footer className="login-auth-footer">Healthcare Suite</footer>
            </section>
          ) : view === 'login' ? (
            <section className="login-auth-view"><button type="button" className="login-back-button" onClick={() => setView('welcome')}>{t('login.back')}</button><header className="login-auth-header"><h2>{t('login.signInTitle')}</h2><p>{t('login.signInText')}</p></header>
              <form className="login-form-grid" onSubmit={handleSubmit}><label className="login-form-group"><span>{t('login.username')}</span><input name="username" type="text" autoComplete="username"/></label><label className="login-form-group"><span>{t('login.password')}</span><div className="login-input-wrapper"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"/><button type="button" aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')} onClick={() => setShowPassword(v => !v)}>{showPassword ? '🙈' : '👁'}</button></div></label>{message && <div className="login-form-message">{message}</div>}<button type="button" className="login-forgot-link" onClick={() => { setMessage(''); setView('forgot') }}>{t('login.forgotPassword')}</button><button className="login-primary-button" type="submit">{t('login.signIn')}</button></form>
            </section>
          ) : (
            <section className="login-auth-view"><button type="button" className="login-back-button" onClick={() => { setMessage(''); setView('login') }}>{t('login.back')}</button><header className="login-auth-header"><h2>{t('login.forgotTitle')}</h2><p>{t('login.forgotText')}</p></header><form className="login-form-grid" onSubmit={(e)=>{e.preventDefault();setMessage(t('login.recoverySent'))}}><label className="login-form-group"><span>{t('login.username')}</span><input required name="recovery" type="text" autoComplete="username"/></label>{message&&<div className="login-form-message login-form-message--success">{message}</div>}<button className="login-primary-button" type="submit">{t('login.sendRecovery')}</button></form></section>
          )}
        </div></section>
      </section>
    </main>
  )
}

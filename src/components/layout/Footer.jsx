import { useI18n } from '../../i18n'
import { BUILD_VERSION } from '../../config/version'
import { IS_PRODUCTION } from '../../core/runtime'

export default function Footer() {
  const { t, language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  return (
    <footer className="footer">
      <span className="footer__brand">Healthcare Suite <small>v{BUILD_VERSION}</small></span>
      <span className={`footer__environment ${IS_PRODUCTION ? 'is-production' : 'is-demo'}`}>
        <i aria-hidden="true" />{IS_PRODUCTION ? L('Παραγωγικό περιβάλλον','Production') : L('Demo περιβάλλον','Demo')}
      </span>
      <span className="footer__secure">{t('common.secureEnvironment')}</span>
    </footer>
  )
}

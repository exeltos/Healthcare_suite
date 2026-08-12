import { useI18n } from '../../i18n'
import Button from './Button/Button'

export default function LanguageSwitcher({ compact = false, className = '' }) {
  const { language, setLanguage, t } = useI18n()
  return (
    <div className={`language-switcher ${compact ? 'compact' : ''} ${className}`.trim()} role="group" aria-label={t('common.language')}>
      <Button type="button" className={language === 'el' ? 'active' : ''} onClick={() => setLanguage('el')} aria-pressed={language === 'el'}>{compact ? 'EL' : t('common.greek')}</Button>
      <Button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>{compact ? 'EN' : t('common.english')}</Button>
    </div>
  )
}

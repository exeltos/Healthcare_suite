import { useI18n } from '../../i18n'

export default function LanguageSwitcher({ compact = false, className = '' }) {
  const { language, setLanguage, t } = useI18n()
  const nextLanguage = language === 'el' ? 'en' : 'el'
  const nextLabel = nextLanguage.toUpperCase()
  return (
    <button
      type="button"
      className={`language-toggle ${compact ? 'compact' : ''} ${className}`.trim()}
      onClick={() => setLanguage(nextLanguage)}
      aria-label={`${t('common.language')}: ${nextLabel}`}
      title={`${t('common.language')}: ${nextLabel}`}
    >
      {nextLabel}
    </button>
  )
}

import { useI18n } from '../../i18n'

export default function Footer() {
  const { t } = useI18n()
  return <footer className="footer"><span>Healthcare Suite</span><span></span><span>{t('common.secureEnvironment')}</span></footer>
}

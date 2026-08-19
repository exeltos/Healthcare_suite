import Button from '../Button/Button'
import { useI18n } from '../../../i18n'
import './FormActions.css'

export default function FormActions({
  onCancel,
  onSaveAndNew,
  onBack,
  showBack = false,
  cancelLabel,
  backLabel,
  saveLabel,
  primaryLabel,
  saveAndNewLabel,
  onPrimary,
  primaryType = 'submit',
  saving = false,
  disabled = false,
  primaryDisabled = false,
  form,
  sticky = true,
  extraActions,
  destructive,
  className = '',
}) {
  const { language } = useI18n()
  const L = (el, en) => language === 'en' ? en : el
  const resolvedCancelLabel = cancelLabel || L('Ακύρωση', 'Cancel')
  const resolvedBackLabel = backLabel || L('← Πίσω', '← Back')
  const resolvedSaveLabel = saveLabel || L('Αποθήκευση', 'Save')
  const resolvedSaveAndNewLabel = saveAndNewLabel || L('Αποθήκευση & νέα', 'Save & new')
  const resolvedPrimaryLabel = primaryLabel || resolvedSaveLabel
  const resolvedDisabled = disabled || primaryDisabled || saving

  return (
    <footer className={`core-form-actions ${sticky ? 'core-form-actions--sticky' : ''} ${className}`.trim()}>
      <div className="core-form-actions__secondary">
        {destructive}
        {extraActions}
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            {resolvedCancelLabel}
          </Button>
        )}
      </div>
      <div className="core-form-actions__primary">
        {showBack && (
          <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
            {resolvedBackLabel}
          </Button>
        )}
        {onSaveAndNew && (
          <Button type="button" variant="secondary" onClick={onSaveAndNew} disabled={resolvedDisabled}>
            {resolvedSaveAndNewLabel}
          </Button>
        )}
        <Button
          type={primaryType}
          form={form}
          onClick={onPrimary}
          disabled={resolvedDisabled}
          loading={saving}
          loadingLabel={L('Αποθήκευση…', 'Saving…')}
          data-feedback-action="save"
        >
          {resolvedPrimaryLabel}
        </Button>
      </div>
    </footer>
  )
}

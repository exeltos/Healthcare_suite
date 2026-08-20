import Button from '../Button/Button'
import { ArrowLeft, Plus, Save, X } from 'lucide-react'
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
  showPrimary = true,
  primaryIcon,
  cancelIcon,
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
      </div>
      <div className="core-form-actions__primary">
        {showBack && (
          <Button type="button" variant="ghost" icon={<ArrowLeft size={16} />} onClick={onBack} disabled={saving}>
            {resolvedBackLabel.replace(/^←\s*/, '')}
          </Button>
        )}
        {onSaveAndNew && (
          <Button type="button" variant="secondary" icon={<Plus size={16} />} onClick={onSaveAndNew} disabled={resolvedDisabled}>
            {resolvedSaveAndNewLabel}
          </Button>
        )}
        {onCancel && (
          <Button type="button" variant="secondary" icon={cancelIcon ?? <X size={16} />} onClick={onCancel} disabled={saving}>
            {resolvedCancelLabel}
          </Button>
        )}
        {showPrimary && (
          <Button
            type={primaryType}
            form={form}
            icon={primaryIcon ?? <Save size={16} />}
            onClick={onPrimary}
            disabled={resolvedDisabled}
            loading={saving}
            loadingLabel={L('Αποθήκευση…', 'Saving…')}
            data-feedback-action="save"
          >
            {resolvedPrimaryLabel}
          </Button>
        )}
      </div>
    </footer>
  )
}

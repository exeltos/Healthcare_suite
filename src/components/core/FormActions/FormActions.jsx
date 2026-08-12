import Button from '../Button/Button'
import './FormActions.css'

export default function FormActions({
  onCancel,
  onSaveAndNew,
  onBack,
  showBack = false,
  cancelLabel = 'Ακύρωση',
  backLabel = '← Πίσω',
  saveLabel = 'Αποθήκευση',
  primaryLabel,
  saveAndNewLabel = 'Αποθήκευση & νέα',
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
  const resolvedPrimaryLabel = primaryLabel || saveLabel
  const resolvedDisabled = disabled || primaryDisabled || saving

  return (
    <footer className={`core-form-actions ${sticky ? 'core-form-actions--sticky' : ''} ${className}`.trim()}>
      <div className="core-form-actions__secondary">
        {destructive}
        {extraActions}
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            {cancelLabel}
          </Button>
        )}
      </div>
      <div className="core-form-actions__primary">
        {showBack && (
          <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
            {backLabel}
          </Button>
        )}
        {onSaveAndNew && (
          <Button type="button" variant="secondary" onClick={onSaveAndNew} disabled={resolvedDisabled}>
            {saveAndNewLabel}
          </Button>
        )}
        <Button
          type={primaryType}
          form={form}
          onClick={onPrimary}
          disabled={resolvedDisabled}
          loading={saving}
          loadingLabel="Αποθήκευση…"
          data-feedback-action="save"
        >
          {resolvedPrimaryLabel}
        </Button>
      </div>
    </footer>
  )
}

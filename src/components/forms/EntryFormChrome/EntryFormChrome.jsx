import FormActions from '../../core/FormActions/FormActions'
import Button from '../../core/Button/Button'
import { ArrowLeft, X } from 'lucide-react'
import { useI18n } from '../../../i18n'
import './EntryFormChrome.css'

export function EntryFormHeader({ eyebrow, title, description, onClose, compact = false }) {
  const { language } = useI18n()
  const L = (el,en) => language === 'en' ? en : el
  return (
    <header className={`entry-form-header ${compact ? "entry-form-header--compact" : ""}`.trim()}>
      <div className="entry-form-header__identity">
        {compact && onClose ? (
          <Button type="button" variant="secondary" size="sm" icon={<ArrowLeft size={16}/>} onClick={onClose} className="entry-form-header__back">
            {L('Πίσω','Back')}
          </Button>
        ) : null}
        <div>
          {eyebrow && <span className="entry-form-header__eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {!compact && onClose && <Button
        type="button"
        variant="secondary"
        size="sm"
        icon={<X size={15}/>}
        onClick={onClose}
        className="entry-form-header__cancel"
      >
        {L('Ακύρωση','Cancel')}
      </Button>}
    </header>
  )
}

export function EntryFormStepper({ steps, activeStep }) {
  if (!steps || steps.length < 2) return null

  return (
    <nav className="entry-form-stepper" aria-label="Βήματα καταχώρησης">
      {steps.map((item, index) => {
        const number = index + 1
        const state = number < activeStep ? 'completed' : number === activeStep ? 'active' : ''
        return (
          <div className={`entry-form-stepper__item ${state}`} key={item.id || item.label}>
            <div className="entry-form-stepper__track">
              <span className="entry-form-stepper__circle">
                {number < activeStep ? '✓' : number}
              </span>
              {index < steps.length - 1 && <span className="entry-form-stepper__line" />}
            </div>
            <span className="entry-form-stepper__label">{item.label}</span>
          </div>
        )
      })}
    </nav>
  )
}

export function EntryFormSection({ eyebrow, title, description, children, className = '' }) {
  return (
    <section className={`entry-form-section ${className}`}>
      {(eyebrow || title || description) && (
        <div className="entry-form-section__heading">
          {eyebrow && <span>{eyebrow}</span>}
          {title && <h3>{title}</h3>}
          {description && <p>{description}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

export function EntryFormFooter({
  onCancel,
  compact = false,
  onBack,
  showBack = false,
  primaryLabel = 'Επόμενο',
  onPrimary,
  primaryType = 'button',
  form,
  primaryDisabled = false,
  saving = false,
}) {
  return (
    <FormActions
      onCancel={onCancel}
      onBack={onBack}
      showBack={showBack}
      primaryLabel={primaryLabel}
      onPrimary={onPrimary}
      primaryType={primaryType}
      form={form}
      primaryDisabled={primaryDisabled}
      saving={saving}
      sticky={false}
      className={`entry-form-footer ${compact ? 'entry-form-footer--compact' : ''}`.trim()}
    />
  )
}

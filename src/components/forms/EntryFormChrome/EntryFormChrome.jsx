import FormActions from '../../core/FormActions/FormActions'
import './EntryFormChrome.css'

export function EntryFormHeader({ eyebrow, title, description, onClose }) {
  return (
    <header className="entry-form-header">
      <div className="entry-form-header__identity">
        <div>
          {eyebrow && <span className="entry-form-header__eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      <button
        type="button"
        className="entry-form-header__close"
        onClick={onClose}
        aria-label="Κλείσιμο"
      >
        ×
      </button>
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
  onBack,
  showBack = false,
  primaryLabel = 'Επόμενο',
  onPrimary,
  primaryType = 'button',
  form,
  primaryDisabled = false,
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
      sticky={false}
      className="entry-form-footer"
    />
  )
}

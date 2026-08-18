import './FormSection.css'

export default function FormSection({
  title,
  description,
  eyebrow,
  actions,
  children,
  className = '',
  variant = 'surface',
}) {
  return (
    <section className={`core-form-section core-form-section--${variant} ${className}`.trim()}>
      {(eyebrow || title || description || actions) && (
        <header className="core-form-section__header">
          <div className="core-form-section__heading">
            {eyebrow && <span className="core-form-section__eyebrow">{eyebrow}</span>}
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="core-form-section__actions">{actions}</div>}
        </header>
      )}
      <div className="core-form-section__content">{children}</div>
    </section>
  )
}

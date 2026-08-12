import './PageSection.css'

export default function PageSection({ title, description, actions, children, card = false, className = '' }) {
  return (
    <section className={`lds-page-section ${card ? 'lds-page-section--card' : ''} ${className}`}>
      {(title || description || actions) && (
        <div className="lds-page-section__header">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="lds-page-section__actions">{actions}</div>}
        </div>
      )}
      <div className="lds-page-section__content">{children}</div>
    </section>
  )
}

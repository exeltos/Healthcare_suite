import './PageHeader.css'

export default function PageHeader({ eyebrow, title, description, actions, card = false, className = '' }) {
  return (
    <header className={`lds-page-header ${card ? 'lds-page-header--card' : ''} ${className}`}>
      <div className="lds-page-header__copy">
        {eyebrow && <span className="lds-page-header__eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="lds-page-header__actions">{actions}</div>}
    </header>
  )
}

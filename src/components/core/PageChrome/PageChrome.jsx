import './PageChrome.css'

export default function PageChrome({
  back,
  header,
  children,
  className = '',
}) {
  return (
    <section className={`lds-page-chrome ${className}`}>
      {back && <div className="lds-page-chrome__back">{back}</div>}
      {header && <div className="lds-page-chrome__header">{header}</div>}
      <div className="lds-page-chrome__content">{children}</div>
    </section>
  )
}

import './PageToolbar.css'

export default function PageToolbar({ start, end, children, sticky = false, className = '' }) {
  return (
    <div className={`lds-page-toolbar ${sticky ? 'lds-page-toolbar--sticky' : ''} ${className}`}>
      <div className="lds-page-toolbar__start">{start || children}</div>
      {end && <div className="lds-page-toolbar__end">{end}</div>}
    </div>
  )
}

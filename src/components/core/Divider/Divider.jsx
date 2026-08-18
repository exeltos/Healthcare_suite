import './Divider.css'
export default function Divider({ vertical = false, className = '' }) { return <span aria-hidden="true" className={`lds-divider ${vertical ? 'lds-divider--vertical' : ''} ${className}`} /> }

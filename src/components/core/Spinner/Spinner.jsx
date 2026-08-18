import './Spinner.css'
export default function Spinner({ size = 'md', label = 'Φόρτωση' }) { return <span className={`lds-spinner lds-spinner--${size}`} role="status" aria-label={label} /> }

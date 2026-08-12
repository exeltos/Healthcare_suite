import './Badge.css'
export default function Badge({ tone = 'neutral', children, className = '' }) { return <span className={`lds-badge lds-badge--${tone} ${className}`}>{children}</span> }

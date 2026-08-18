import './IconButton.css'
export default function IconButton({ label, size = 'md', variant = 'secondary', className = '', children, ...props }) { return <button type="button" aria-label={label} title={label} className={`lds-icon-button lds-icon-button--${size} lds-icon-button--${variant} ${className}`} {...props}>{children}</button> }

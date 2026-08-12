import './Card.css'
export default function Card({ as: Tag = 'section', variant = 'surface', className = '', children, ...props }) { return <Tag className={`lds-card lds-card--${variant} ${className}`} {...props}>{children}</Tag> }

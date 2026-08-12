import { ArrowLeft } from 'lucide-react'
import './BackLink.css'

export default function BackLink({ children, label = 'Πίσω στο Κέντρο Διαχείρισης', onClick, className = '' }) {
  return (
    <button type="button" className={`lds-back-link ${className}`} onClick={onClick}>
      <ArrowLeft aria-hidden="true" />
      <span>{children || label}</span>
    </button>
  )
}

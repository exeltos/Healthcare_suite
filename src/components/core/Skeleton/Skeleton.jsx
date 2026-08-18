import './Skeleton.css'
export default function Skeleton({ width = '100%', height = 16, radius = 'md', className = '' }) { return <span aria-hidden="true" className={`lds-skeleton lds-skeleton--${radius} ${className}`} style={{ width, height }} /> }

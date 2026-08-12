import './Pagination.css'

export default function Pagination({
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, total)

  return (
    <div className="core-pagination">
      <span className="core-pagination__summary">{start}–{end} από {total}</span>
      {onPageSizeChange ? (
        <label className="core-pagination__size">
          <span>Ανά σελίδα</span>
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      ) : null}
      <div className="core-pagination__buttons">
        <button type="button" onClick={() => onPageChange?.(safePage - 1)} disabled={safePage <= 1} aria-label="Προηγούμενη σελίδα">‹</button>
        <span>{safePage} / {pageCount}</span>
        <button type="button" onClick={() => onPageChange?.(safePage + 1)} disabled={safePage >= pageCount} aria-label="Επόμενη σελίδα">›</button>
      </div>
    </div>
  )
}

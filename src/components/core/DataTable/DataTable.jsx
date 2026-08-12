import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { rememberLastOpenedRow } from '../../../core/listNavigationMemory'
import EmptyState from '../EmptyState/EmptyState'
import Skeleton from '../Skeleton/Skeleton'
import './DataTable.css'

export default function DataTable({
  columns = [],
  rows = [],
  getRowKey = (row) => row.id,
  emptyTitle = 'Δεν βρέθηκαν εγγραφές',
  emptyMessage = 'Δοκιμάστε διαφορετική αναζήτηση ή φίλτρα.',
  onRowClick,
  loading = false,
  stickyHeader = true,
  compact = false,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  sort,
  onSortChange,
  footer,
  ariaLabel = 'Πίνακας δεδομένων',
  highlightedKey = '',
  showRowCount = false,
}) {
  const tableRef = useRef(null)
  const scrolledHighlightRef = useRef('')
  const location = useLocation()
  const listScope = location.pathname
  const [returnHighlightedKey, setReturnHighlightedKey] = useState(() => {
    const state = location.state || {}
    return state.returnFromDetail && state.listScope === listScope ? String(state.highlightRowKey || '') : ''
  })
  const effectiveHighlightedKey = highlightedKey || returnHighlightedKey
  const selected = new Set(selectedKeys)
  const defaultFooter = showRowCount ? <span>{rows.length} {rows.length === 1 ? 'εγγραφή' : 'εγγραφές'}{selectedKeys.length ? ` · ${selectedKeys.length} επιλεγμένες` : ''}</span> : null
  const visibleKeys = rows.map(getRowKey)
  const allSelected = selectable && visibleKeys.length > 0 && visibleKeys.every((key) => selected.has(key))
  const partlySelected = selectable && visibleKeys.some((key) => selected.has(key)) && !allSelected

  const toggleAll = () => {
    if (allSelected) onSelectionChange?.(selectedKeys.filter((key) => !visibleKeys.includes(key)))
    else onSelectionChange?.([...new Set([...selectedKeys, ...visibleKeys])])
  }

  const toggleOne = (key) => {
    onSelectionChange?.(selected.has(key) ? selectedKeys.filter((item) => item !== key) : [...selectedKeys, key])
  }

  useEffect(() => {
    const state = location.state || {}
    setReturnHighlightedKey(state.returnFromDetail && state.listScope === listScope ? String(state.highlightRowKey || '') : '')
  }, [listScope, location.key, location.state])

  useEffect(() => {
    if (!effectiveHighlightedKey || !tableRef.current) return
    const signature = `${listScope}:${String(effectiveHighlightedKey)}`
    if (scrolledHighlightRef.current === signature) return
    const row = tableRef.current.querySelector(`[data-row-key="${CSS.escape(String(effectiveHighlightedKey))}"]`)
    if (!row) return
    scrolledHighlightRef.current = signature
    row.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [effectiveHighlightedKey, listScope, rows])

  const openRow = (row) => {
    if (!onRowClick) return
    const key = getRowKey(row)
    rememberLastOpenedRow(listScope, key)
    onRowClick(row)
  }

  const changeSort = (column) => {
    if (!column.sortable || !onSortChange) return
    const direction = sort?.key === column.key && sort.direction === 'asc' ? 'desc' : 'asc'
    onSortChange({ key: column.key, direction })
  }

  return (
    <div className={`core-data-table ${compact ? 'is-compact' : ''} ${stickyHeader ? 'has-sticky-header' : ''}`.trim()}>
      <div className="core-data-table__scroll">
        <table ref={tableRef} aria-label={ariaLabel}>
          <thead>
            <tr>
              {selectable ? (
                <th className="core-data-table__check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(node) => { if (node) node.indeterminate = partlySelected }}
                    onChange={toggleAll}
                    aria-label="Επιλογή όλων των εγγραφών"
                  />
                </th>
              ) : null}
              {columns.map((column) => (
                <th key={column.key} style={{ width: column.width, textAlign: column.align || 'left' }} aria-sort={sort?.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {column.sortable ? (
                    <button type="button" className="core-data-table__sort" onClick={() => changeSort(column)}>
                      {column.label}<span aria-hidden="true">{sort?.key === column.key ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                    </button>
                  ) : column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={`skeleton-${rowIndex}`}>
                {selectable ? <td /> : null}
                {columns.map((column) => <td key={column.key}><Skeleton height="18px" /></td>)}
              </tr>
            )) : rows.map((row) => {
              const key = getRowKey(row)
              return (
                <tr
                  key={key}
                  className={`${onRowClick ? 'is-clickable' : ''} ${String(key) === String(effectiveHighlightedKey) ? 'is-highlighted' : ''}`.trim()}
                  data-row-key={String(key)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={() => openRow(row)}
                  onKeyDown={(event) => {
                    if (!onRowClick || (event.key !== 'Enter' && event.key !== ' ')) return
                    event.preventDefault()
                    openRow(row)
                  }}
                >
                  {selectable ? (
                    <td className="core-data-table__check" onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(key)} onChange={() => toggleOne(key)} aria-label={`Επιλογή εγγραφής ${key}`} />
                    </td>
                  ) : null}
                  {columns.map((column) => (
                    <td key={column.key} style={{ textAlign: column.align || 'left' }} data-label={column.label}>
                      {column.render ? column.render(row) : (row[column.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && rows.length === 0 ? <EmptyState title={emptyTitle} description={emptyMessage} compact /> : null}
      </div>
      {(footer || defaultFooter) ? <div className="core-data-table__footer">{footer || defaultFooter}</div> : null}
    </div>
  )
}

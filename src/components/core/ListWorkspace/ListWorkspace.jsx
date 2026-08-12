import BulkActions from '../BulkActions/BulkActions'
import DataTable from '../DataTable/DataTable'
import FilterBar from '../FilterBar/FilterBar'
import './ListWorkspace.css'

export default function ListWorkspace({
  stats,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  activeFilterCount = 0,
  onClearFilters,
  filters,
  selectedCount = 0,
  selectedLabel = 'εγγραφές',
  onClearSelection,
  bulkActions,
  columns,
  rows,
  getRowKey,
  onRowClick,
  selectedKeys = [],
  onSelectionChange,
  sort,
  onSortChange,
  ariaLabel,
  footer,
  emptyTitle,
  emptyMessage,
  highlightedKey = '',
}) {
  return (
    <div className="core-list-workspace">
      <div className="core-list-workspace__stats">{stats}</div>
      <FilterBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        activeCount={activeFilterCount}
        onClear={onClearFilters}
        equalControls
        className="core-list-workspace__filters"
      >
        {filters}
      </FilterBar>
      <BulkActions count={selectedCount} label={selectedLabel} onClear={onClearSelection}>
        {bulkActions}
      </BulkActions>
      <div className="core-list-workspace__table">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={getRowKey}
          onRowClick={onRowClick}
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
          sort={sort}
          onSortChange={onSortChange}
          ariaLabel={ariaLabel}
          showRowCount={false}
          emptyTitle={emptyTitle}
          emptyMessage={emptyMessage}
          highlightedKey={highlightedKey}
        />
      </div>
    </div>
  )
}

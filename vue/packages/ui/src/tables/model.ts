import type { VNodeChild } from 'vue'

export type SortDirection = 'asc' | 'desc'
export interface SortState { key: string; direction: SortDirection }
export type InsertPosition = 'before' | 'after'
export interface TableColumn<Row extends object> {
  key: string
  header: VNodeChild
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
  cell?: (row: Row) => VNodeChild
  editable?: boolean
  sortValue?: (row: Row) => string | number
}
export const tableMessages = {
  empty: 'No data', selectAll: 'Select all rows', selectRow: 'Select row {row}',
  cellLabel: '{column} for row {row}', cellPlaceholder: 'Empty', columnOptions: '{column} column options',
  reorderColumn: 'Reorder {column} column', renameColumn: 'Rename {column} column',
  resizeColumn: 'Resize {column} column', rowOptions: 'Row {row} options', insertBefore: 'Insert before',
  insertAfter: 'Insert after', deleteColumn: 'Delete column', deleteRow: 'Delete row',
}
export type TableMessages = typeof tableMessages
export interface TableProps<Row extends object> {
  data: readonly Row[]
  columns: readonly TableColumn<Row>[]
  getRowId?: (row: Row, index: number) => string
  selectable?: boolean
  selectedRowIds?: readonly string[]
  defaultSelectedRowIds?: readonly string[]
  sort?: SortState | null
  defaultSort?: SortState | null
  resizable?: boolean
  minColumnWidth?: number
  reorderable?: boolean
  onCellEdit?: (rowId: string, columnKey: string, value: string) => void
  onColumnRename?: (key: string, value: string) => void
  onInsertRow?: (index: number, position: InsertPosition) => void
  onDeleteRow?: (rowId: string, index: number) => void
  onInsertColumn?: (index: number, position: InsertPosition) => void
  onDeleteColumn?: (key: string, index: number) => void
  rowHeight?: number
  height?: number
  overscan?: number
  loading?: boolean
  skeletonRows?: number
  emptyState?: VNodeChild
  labels?: Partial<TableMessages>
  label?: string
}

export function orderColumns<Row extends object>(columns: readonly TableColumn<Row>[], order: readonly string[]) {
  const byKey = new Map(columns.map(column => [column.key, column]))
  const keys = order.filter(key => byKey.has(key))
  for (const [index, column] of columns.entries()) {
    if (!keys.includes(column.key)) {
      const at = index ? keys.indexOf(columns[index - 1].key) + 1 : 0
      keys.splice(at, 0, column.key)
    }
  }
  return keys.map(key => byKey.get(key)!)
}

export function field<Row extends object>(row: Row, key: string) {
  return (row as Record<string, unknown>)[key]
}

export function sortedEntries<Row extends object>(rows: { id: string; row: Row }[], columns: readonly TableColumn<Row>[], sort: SortState | null) {
  const column = columns.find(item => item.key === sort?.key)
  if (!sort || !column) return rows
  const value = (row: Row) => column.sortValue ? column.sortValue(row) : field(row, column.key)
  return [...rows].sort((left, right) => {
    const first = value(left.row), second = value(right.row)
    const difference = typeof first === 'number' && typeof second === 'number' ? first - second : String(first).localeCompare(String(second))
    return sort.direction === 'asc' ? difference : -difference
  })
}

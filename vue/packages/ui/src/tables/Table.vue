<script setup lang="ts" generic="Row extends object">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type FunctionalComponent, type VNodeChild } from 'vue'
import { pressSpring } from '../core/motion'
import { field, orderColumns, sortedEntries, tableMessages, type SortState, type TableColumn, type TableProps } from './model'
import Checkbox from '../controls/Checkbox.vue'
import TableIcon from './TableIcon.vue'
import TableMenu, { type TableMenuItem } from './TableMenu.vue'

const props = defineProps<TableProps<Row>>()
const emit = defineEmits<{
  'update:selectedRowIds': [ids: string[]]; selectionChange: [ids: string[]]
  'update:sort': [sort: SortState | null]; sortChange: [sort: SortState | null]
  columnResize: [key: string, width: number]; columnOrderChange: [keys: string[]]; endReached: []
}>()

/** Narrowest a column of bare inputs may be floored to and still show a value: the cell's own padding eats 32 of it. */
const INPUT_COLUMN_WIDTH = 120
const CHECKBOX_PX = 48

const reduce = useReducedMotion()
const viewport = useTemplateRef<HTMLDivElement>('viewport')
const top = shallowRef(0), rootFont = shallowRef(16)
const rowHeight = computed(() => Math.max(1, props.rowHeight ?? 48))
const height = computed(() => Math.max(rowHeight.value, props.height ?? 440))
const overscan = computed(() => Math.max(0, Math.floor(props.overscan ?? 10)))
const minimum = computed(() => Math.max(1, props.minColumnWidth ?? 64))
const order = shallowRef<string[]>([])
const columns = computed(() => orderColumns(props.columns, order.value))
const localSort = shallowRef<SortState | null>(props.defaultSort ?? null)
const sort = computed(() => props.sort === undefined ? localSort.value : props.sort)
const entries = computed(() => props.data.map((row, index) => ({ row, id: props.getRowId?.(row, index) ?? String(index) })))
const rows = computed(() => sortedEntries(entries.value, columns.value, sort.value))
const first = computed(() => Math.max(0, Math.min(rows.value.length - 1, Math.floor(top.value / rowHeight.value) - overscan.value)))
const last = computed(() => Math.min(rows.value.length, Math.ceil((top.value + height.value) / rowHeight.value) + overscan.value))
const visible = computed(() => rows.value.slice(first.value, last.value))
const selectedLocal = shallowRef(new Set(props.defaultSelectedRowIds ?? []))
const selected = computed(() => props.selectedRowIds ? new Set(props.selectedRowIds) : selectedLocal.value)
const all = computed(() => rows.value.length > 0 && rows.value.every(entry => selected.value.has(entry.id)))
const some = computed(() => rows.value.some(entry => selected.value.has(entry.id)))
const widths = shallowRef<Record<string, number>>({})
const hasRowMenu = computed(() => Boolean(props.onInsertRow || props.onDeleteRow))
const hasColumnMenu = computed(() => Boolean(props.onInsertColumn || props.onDeleteColumn))
// Real columns + checkbox; the trailing spacer adds one more in colSpans.
const span = computed(() => columns.value.length + Number(Boolean(props.selectable)) + 1)
// In a container narrower than the columns, `table-layout: fixed` shrinks every column toward zero
// instead of scrolling. Floor the table at what the columns asked for, then let the viewport scroll.
const pixels = computed(() => Math.round(columns.value.reduce((total, column) => {
  if (widths.value[column.key]) return total + widths.value[column.key]
  const measure = Number.parseFloat(column.width ?? '')
  if (Number.isFinite(measure)) {
    if (column.width?.endsWith('px')) return total + measure
    if (column.width?.endsWith('rem')) return total + measure * rootFont.value
  }
  return total + (props.onColumnRename || (!column.cell && column.editable) ? Math.max(INPUT_COLUMN_WIDTH, minimum.value) : minimum.value)
}, props.selectable ? CHECKBOX_PX : 0)))
// Only shrink-wrap once every column has an explicit resized width; otherwise stay fill-width so a flexible column can't size to cell content.
const sized = computed(() => columns.value.length > 0 && columns.value.every(column => widths.value[column.key]))
const loadingRows = computed(() => !rows.value.length ? Math.max(1, Math.ceil(height.value / rowHeight.value)) : Math.max(0, props.skeletonRows ?? 3))
const dropIndex = shallowRef<number | null>(null)
const drag = shallowRef<{ key: string; kind: 'resize' | 'order'; start: number; width: number; pointer: number } | null>(null)
let reached = false
const Content: FunctionalComponent<{ value: VNodeChild }> = ({ value }) => value
Content.props = ['value']
function translate(key: keyof typeof tableMessages, column = '', row = 0) {
  return (props.labels?.[key] ?? tableMessages[key]).replaceAll('{column}', column).replaceAll('{row}', String(row))
}
function sortColumn(key: string) {
  let next: SortState | null = { key, direction: 'asc' }
  if (sort.value?.key === key) next = sort.value.direction === 'asc' ? { key, direction: 'desc' } : null
  if (props.sort === undefined) localSort.value = next
  emit('update:sort', next); emit('sortChange', next)
}
function changeSelection(next: Set<string>) {
  if (!props.selectedRowIds) selectedLocal.value = next
  const ids = [...next]
  emit('update:selectedRowIds', ids); emit('selectionChange', ids)
}
function toggleRow(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  changeSelection(next)
}
function toggleAll() {
  const next = new Set(selected.value)
  for (const entry of rows.value) {
    if (all.value) next.delete(entry.id)
    else next.add(entry.id)
  }
  changeSelection(next)
}
function scroll() {
  const element = viewport.value
  if (!element) return
  top.value = element.scrollTop
  const near = element.scrollHeight - element.scrollTop - element.clientHeight < rowHeight.value * 4
  if (!near) reached = false
  else if (!reached && !props.loading) { reached = true; emit('endReached') }
}
watch(() => props.loading, loading => { if (!loading) reached = false })
onMounted(() => { rootFont.value = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 })
function headerElements() { return Array.from(viewport.value?.querySelectorAll<HTMLElement>('th[data-key]') ?? []) }
function freezeWidths() {
  const fixed: Record<string, number> = { ...widths.value }
  for (const element of headerElements()) {
    const key = element.dataset.key!
    if (fixed[key] == null) fixed[key] = Math.round(element.getBoundingClientRect().width) || minimum.value
  }
  widths.value = fixed
}
function setWidth(key: string, value: number) {
  widths.value = { ...widths.value, [key]: Math.max(minimum.value, Math.round(value)) }
}
function place(key: string, destination: number) {
  const keys = columns.value.map(column => column.key).filter(item => item !== key)
  keys.splice(Math.max(0, Math.min(keys.length, destination)), 0, key)
  order.value = keys
  emit('columnOrderChange', keys)
}
function begin(event: PointerEvent, key: string, kind: 'resize' | 'order') {
  if (event.button !== 0 || drag.value) return
  event.preventDefault()
  event.stopPropagation()
  if (kind === 'resize') freezeWidths()
  drag.value = { key, kind, pointer: event.pointerId, start: event.clientX, width: widths.value[key] ?? minimum.value }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function move(event: PointerEvent) {
  const state = drag.value
  if (!state || event.pointerId !== state.pointer) return
  if (state.kind === 'resize') { setWidth(state.key, state.width + event.clientX - state.start); return }
  const headers = headerElements()
  const index = headers.findIndex(header => {
    const rect = header.getBoundingClientRect()
    return event.clientX < rect.left + rect.width / 2
  })
  dropIndex.value = index < 0 ? headers.length : index
}
function end(event: PointerEvent, cancelled = false) {
  const state = drag.value
  if (!state || event.pointerId !== state.pointer) return
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
  if (state.kind === 'resize') emit('columnResize', state.key, widths.value[state.key])
  else if (!cancelled && dropIndex.value !== null) {
    const from = columns.value.findIndex(column => column.key === state.key)
    place(state.key, dropIndex.value - Number(from < dropIndex.value))
  }
  drag.value = null; dropIndex.value = null
}
function keyboard(event: KeyboardEvent, key: string, kind: 'resize' | 'order') {
  const offset = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
  if (!offset) return
  event.preventDefault()
  if (kind === 'order') { place(key, columns.value.findIndex(column => column.key === key) + offset); return }
  freezeWidths()
  setWidth(key, widths.value[key] + offset * 16)
  emit('columnResize', key, widths.value[key])
}
function menuItems(kind: 'row' | 'column', id: string, index: number): TableMenuItem[] {
  const insert = kind === 'row' ? props.onInsertRow : props.onInsertColumn
  const remove = kind === 'row' ? props.onDeleteRow : props.onDeleteColumn
  const items: TableMenuItem[] = []
  if (insert) {
    items.push({ label: translate('insertBefore'), icon: kind === 'row' ? 'row-before' : 'column-before', action: () => insert(index, 'before') })
    items.push({ label: translate('insertAfter'), icon: kind === 'row' ? 'row-after' : 'column-after', action: () => insert(index, 'after') })
  }
  if (remove) items.push({ label: translate(kind === 'row' ? 'deleteRow' : 'deleteColumn'), icon: 'trash', destructive: true, action: () => remove(id, index) })
  return items
}
function columnWidth(column: TableColumn<Row>) {
  if (widths.value[column.key]) return `${widths.value[column.key]}px`
  return column.width || undefined
}

// The insert handles float on a column's top border and a row's left border. They are `position: fixed`
// so the scroll container cannot clip them; a short leave delay lets the pointer cross onto the handle.
const activeColumn = shallowRef<string | null>(null)
const activeRow = shallowRef<string | null>(null)
const columnAnchor = shallowRef({ top: 0, left: 0 })
const rowAnchor = shallowRef({ top: 0, left: 0 })
let menuOpen = false, columnTimer: ReturnType<typeof setTimeout> | undefined, rowTimer: ReturnType<typeof setTimeout> | undefined
function activateColumn(key: string, element: HTMLElement) {
  clearTimeout(columnTimer)
  const rect = element.getBoundingClientRect()
  columnAnchor.value = { top: rect.top, left: rect.left + rect.width / 2 }
  activeColumn.value = key
}
function deactivateColumn() {
  clearTimeout(columnTimer)
  columnTimer = setTimeout(() => { if (!menuOpen) activeColumn.value = null }, 100)
}
function activateRow(id: string, element: HTMLElement) {
  clearTimeout(rowTimer)
  const rect = element.getBoundingClientRect()
  rowAnchor.value = { top: rect.top + rect.height / 2, left: rect.left }
  activeRow.value = id
}
function deactivateRow() {
  clearTimeout(rowTimer)
  rowTimer = setTimeout(() => { if (!menuOpen) activeRow.value = null }, 100)
}
function menuToggled(open: boolean) {
  menuOpen = open
  if (!open) { deactivateColumn(); deactivateRow() }
}
function dropHandles() {
  if (menuOpen) return
  activeColumn.value = null
  activeRow.value = null
}
onMounted(() => window.addEventListener('scroll', dropHandles, true))
onBeforeUnmount(() => {
  window.removeEventListener('scroll', dropHandles, true)
  clearTimeout(columnTimer); clearTimeout(rowTimer)
})
function handleStyle(active: boolean, anchor: { top: number; left: number }) {
  return active ? { top: `${anchor.top}px`, left: `${anchor.left}px` } : undefined
}
</script>

<template>
  <div class="beui-table" data-slot="table">
    <div ref="viewport" class="table-scroll" role="region" :aria-label="label ?? 'Data table'" tabindex="0" :style="{ height: `${height}px` }" @scroll.passive="scroll">
      <table :aria-label="label ?? 'Data table'" :aria-rowcount="rows.length + 1" :aria-busy="Boolean(loading)" :data-sized="sized || undefined" :style="{ minWidth: `max(100%, ${pixels}px)` }">
        <colgroup>
          <col v-if="selectable" :style="{ width: `${CHECKBOX_PX}px` }">
          <col v-for="column in columns" :key="column.key" :style="{ width: columnWidth(column) }">
          <!-- Empty filler owns the leftover space: no gap, content unpinned. -->
          <col>
        </colgroup>
        <thead>
          <tr aria-rowindex="1" :style="{ height: `${rowHeight}px` }">
            <th v-if="selectable" scope="col" class="lead">
              <div class="lead-cell"><Checkbox class="table-checkbox" :model-value="all" :indeterminate="!all && some" :aria-label="translate('selectAll')" @update:model-value="toggleAll()" /></div>
            </th>
            <th
              v-for="(column, columnIndex) in columns" :key="column.key" scope="col" class="head" :data-key="column.key" :data-active="activeColumn === column.key || undefined"
              :data-drop="drag?.kind === 'order' ? dropIndex === columnIndex : undefined" :data-dropend="drag?.kind === 'order' ? dropIndex === columns.length && columnIndex === columns.length - 1 : undefined"
              :aria-sort="sort?.key === column.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : undefined"
              @pointerenter="hasColumnMenu && activateColumn(column.key, $event.currentTarget as HTMLElement)" @pointerleave="hasColumnMenu && deactivateColumn()"
              @focusin="hasColumnMenu && activateColumn(column.key, $event.currentTarget as HTMLElement)" @focusout="hasColumnMenu && deactivateColumn()"
            >
              <motion.div
                class="header" :data-align="column.align" :style="{ height: `${rowHeight}px` }"
                :animate="reduce ? { opacity: drag?.key === column.key && drag.kind === 'order' ? .5 : 1 } : { scale: drag?.key === column.key && drag.kind === 'order' ? 1.04 : 1, opacity: drag?.key === column.key && drag.kind === 'order' ? .5 : 1 }"
                :transition="pressSpring"
              >
                <button v-if="reorderable" type="button" class="grip" :aria-label="translate('reorderColumn', column.key)" @pointerdown="begin($event, column.key, 'order')" @pointermove="move" @pointerup="end($event)" @pointercancel="end($event, true)" @keydown="keyboard($event, column.key, 'order')"><TableIcon name="grip" /></button>
                <button v-if="column.sortable" type="button" class="sort" :data-align="column.align" :data-active="sort?.key === column.key || undefined" @click="sortColumn(column.key)">
                  <span class="truncate"><slot name="header" :column="column"><Content :value="column.header" /></slot></span>
                  <span class="chevron" :data-desc="(sort?.key === column.key && sort.direction === 'desc') || undefined" aria-hidden="true"><TableIcon name="chevron" /></span>
                </button>
                <input v-else-if="onColumnRename" class="rename" :data-align="column.align" size="1" :aria-label="translate('renameColumn', column.key)" :value="typeof column.header === 'string' ? column.header : ''" @input="onColumnRename(column.key, ($event.currentTarget as HTMLInputElement).value)">
                <span v-else class="plain truncate" :data-align="column.align"><slot name="header" :column="column"><Content :value="column.header" /></slot></span>
              </motion.div>
              <button v-if="resizable" type="button" class="resize" :aria-label="translate('resizeColumn', column.key)" @pointerdown="begin($event, column.key, 'resize')" @pointermove="move" @pointerup="end($event)" @pointercancel="end($event, true)" @keydown="keyboard($event, column.key, 'resize')" />
              <TableMenu v-if="hasColumnMenu" :label="translate('columnOptions', column.key)" :items="menuItems('column', column.key, columnIndex)" class="handle column-handle" :data-active="activeColumn === column.key || undefined" :style="handleStyle(activeColumn === column.key, columnAnchor)" @open-change="menuToggled">
                <TableIcon name="more-horizontal" />
              </TableMenu>
            </th>
            <th aria-hidden="true" class="filler" />
          </tr>
        </thead>
        <tbody>
          <template v-if="rows.length === 0">
            <template v-if="loading">
              <tr v-for="index in loadingRows" :key="index" aria-hidden="true" class="row skeleton" :style="{ height: `${rowHeight}px` }">
                <td v-if="selectable" /><td v-for="column in columns" :key="column.key" :data-align="column.align"><i :data-end="column.align === 'right' || undefined" /></td><td />
              </tr>
            </template>
            <tr v-else><td :colspan="span" class="empty"><slot name="empty"><Content :value="emptyState ?? translate('empty')" /></slot></td></tr>
          </template>
          <template v-else>
            <tr v-if="first > 0" aria-hidden="true" :style="{ height: `${first * rowHeight}px` }"><td :colspan="span" /></tr>
            <tr
              v-for="(entry, index) in visible" :key="entry.id" class="row" :aria-rowindex="first + index + 2" :data-selected="selected.has(entry.id)" :style="{ height: `${rowHeight}px` }"
              @pointerenter="hasRowMenu && activateRow(entry.id, $event.currentTarget as HTMLElement)" @pointerleave="hasRowMenu && deactivateRow()"
              @focusin="hasRowMenu && activateRow(entry.id, $event.currentTarget as HTMLElement)" @focusout="hasRowMenu && deactivateRow()"
            >
              <td v-if="selectable" class="lead">
                <div class="lead-cell"><Checkbox :model-value="selected.has(entry.id)" :aria-label="translate('selectRow', '', first + index + 1)" @update:model-value="toggleRow(entry.id)" /></div>
                <TableMenu v-if="hasRowMenu" :label="translate('rowOptions', '', first + index + 1)" :items="menuItems('row', entry.id, first + index)" class="handle row-handle" :data-active="activeRow === entry.id || undefined" :style="handleStyle(activeRow === entry.id, rowAnchor)" @open-change="menuToggled">
                  <TableIcon name="more-vertical" />
                </TableMenu>
              </td>
              <td v-for="(column, columnIndex) in columns" :key="column.key" class="cell" :data-align="column.align">
                <slot :name="`cell-${column.key}`" :row="entry.row" :column="column" :index="first + index">
                  <Content v-if="column.cell" :value="column.cell(entry.row)" />
                  <input v-else-if="column.editable" class="editable" size="1" :value="String(field(entry.row, column.key) ?? '')" :placeholder="translate('cellPlaceholder')" :aria-label="translate('cellLabel', column.key, first + index + 1)" @input="onCellEdit?.(entry.id, column.key, ($event.currentTarget as HTMLInputElement).value)">
                  <template v-else>{{ field(entry.row, column.key) }}</template>
                </slot>
                <TableMenu v-if="hasRowMenu && !selectable && columnIndex === 0" :label="translate('rowOptions', '', first + index + 1)" :items="menuItems('row', entry.id, first + index)" class="handle row-handle" :data-active="activeRow === entry.id || undefined" :style="handleStyle(activeRow === entry.id, rowAnchor)" @open-change="menuToggled">
                  <TableIcon name="more-vertical" />
                </TableMenu>
              </td>
              <td aria-hidden="true" />
            </tr>
            <tr v-if="last < rows.length" aria-hidden="true" :style="{ height: `${(rows.length - last) * rowHeight}px` }"><td :colspan="span" /></tr>
            <template v-if="loading">
              <tr v-for="index in loadingRows" :key="`skeleton-${index}`" aria-hidden="true" class="row skeleton" :style="{ height: `${rowHeight}px` }">
                <td v-if="selectable" /><td v-for="column in columns" :key="column.key" :data-align="column.align"><i :data-end="column.align === 'right' || undefined" /></td><td />
              </tr>
            </template>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.beui-table { box-sizing: border-box; width: 100%; min-width: 0; overflow: hidden; border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; }
.beui-table .table-scroll { overflow: auto; overscroll-behavior: contain; }
.beui-table .table-scroll:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: -2px; }
/* The docs theme styles bare <table>, <tr>, <th> and <td>; reset what it adds so the table is drawn by this file alone. */
.beui-table table { display: table; box-sizing: border-box; width: auto; max-width: none; margin: 0; table-layout: fixed; border-collapse: collapse; border: 0; overflow: visible; font-size: inherit; line-height: inherit; }
.beui-table table[data-sized] { width: max-content; }
.beui-table tr, .beui-table th, .beui-table td { margin: 0; padding: 0; border: 0 solid; background: transparent; text-align: left; vertical-align: middle; }
.beui-table th { text-align: center; }
.beui-table tbody tr { border-color: color-mix(in srgb, var(--beui-border) 60%, transparent); border-bottom-width: 1px; transition: background-color .15s; }
.beui-table th { position: sticky; top: 0; z-index: 10; border-color: var(--beui-border); border-bottom-width: 1px; background: var(--beui-muted); font-weight: 700; color: inherit; }
.beui-table th.head { font-weight: 500; color: var(--beui-muted-foreground); }
.beui-table th.head[data-active] { box-shadow: inset 0 1px 0 var(--beui-primary); }
.beui-table th.head[data-drop='true']::before, .beui-table th.head[data-dropend='true']::after { content: ''; position: absolute; top: 0; bottom: 0; width: 2px; background: var(--beui-primary); }
.beui-table th.head[data-drop='true']::before { left: 0; }
.beui-table th.head[data-dropend='true']::after { right: 0; }
.beui-table .lead { text-align: center; }
.beui-table .lead-cell { display: flex; align-items: center; justify-content: center; }
.beui-table .table-checkbox { width: 1.5rem; height: 1.5rem; }
.beui-table .header { display: flex; height: 100%; align-items: center; justify-content: flex-start; }
.beui-table .header[data-align='right'] { justify-content: flex-end; }
.beui-table .header[data-align='center'] { justify-content: center; }
.beui-table .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.beui-table button, .beui-table input { font: inherit; }
.beui-table button { margin: 0; padding: 0; border: 0; background: none; color: inherit; cursor: pointer; }
.beui-table .grip { display: flex; flex: none; align-items: center; justify-content: center; width: 1.5rem; height: 100%; color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); cursor: grab; touch-action: none; user-select: none; -webkit-touch-callout: none; transition: color .15s; }
.beui-table .grip:active { cursor: grabbing; }
.beui-table .grip .be-table-icon { width: .875rem; height: .875rem; }
@media (hover: hover) { .beui-table .grip:hover { color: var(--beui-foreground); } }
.beui-table .sort { display: flex; flex: 1; align-items: center; justify-content: flex-start; gap: .25rem; min-width: 0; height: 100%; padding: 0 1rem; user-select: none; transition: color .15s; }
.beui-table .sort[data-align='right'] { justify-content: flex-end; }
.beui-table .sort[data-align='center'] { justify-content: center; }
.beui-table .sort[data-active] { color: var(--beui-foreground); }
@media (hover: hover) { .beui-table .sort:hover { color: var(--beui-foreground); } }
.beui-table .chevron { display: inline-flex; flex: none; opacity: .35; transition: transform .18s cubic-bezier(.16, 1, .3, 1), opacity .18s cubic-bezier(.16, 1, .3, 1); }
.beui-table .sort[data-active] .chevron { opacity: 1; }
.beui-table .chevron[data-desc] { transform: rotate(180deg); }
.beui-table .chevron .be-table-icon { width: .875rem; height: .875rem; }
.beui-table .plain, .beui-table .rename { flex: 1; min-width: 0; padding: 0 1rem; text-align: left; }
.beui-table .plain[data-align='right'], .beui-table .rename[data-align='right'] { text-align: right; }
.beui-table .plain[data-align='center'], .beui-table .rename[data-align='center'] { text-align: center; }
.beui-table .rename { box-sizing: border-box; appearance: none; border: 0; border-radius: .375rem; background: transparent; color: var(--beui-muted-foreground); font-weight: 500; outline: none; text-overflow: ellipsis; transition: background-color .15s, color .15s; }
.beui-table .rename:focus { background: var(--beui-muted); color: var(--beui-foreground); }
.beui-table .rename:focus-visible { box-shadow: 0 0 0 1px var(--beui-ring); }
.beui-table .resize { position: absolute; top: 0; right: 0; width: .375rem; height: 100%; cursor: col-resize; touch-action: none; user-select: none; -webkit-touch-callout: none; transition: background-color .15s; }
@media (hover: hover) { .beui-table .resize:hover { background: var(--beui-muted); } }
.beui-table .resize:focus-visible { background: var(--beui-muted); outline: 2px solid var(--beui-ring); outline-offset: -2px; }
.beui-table .cell { overflow: hidden; padding: 0 1rem; text-overflow: ellipsis; white-space: nowrap; color: var(--beui-foreground); }
.beui-table .cell[data-align='right'] { text-align: right; }
.beui-table .cell[data-align='center'] { text-align: center; }
.beui-table tbody tr.row[data-selected='true'] { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
@media (hover: hover) { .beui-table tbody tr.row:hover { background: color-mix(in srgb, var(--beui-muted) 50%, transparent); } }
.beui-table .editable { box-sizing: border-box; width: 100%; min-width: 0; margin: 0 -.5rem; padding: .25rem .5rem; appearance: none; border: 0; border-radius: .375rem; background: transparent; color: var(--beui-foreground); font: inherit; outline: none; text-overflow: ellipsis; transition: background-color .15s, box-shadow .15s; }
.beui-table .editable::placeholder { color: color-mix(in srgb, var(--beui-muted-foreground) 40%, transparent); }
.beui-table .editable:focus { background: var(--beui-muted); box-shadow: 0 0 0 1px var(--beui-ring); }
.beui-table .empty { padding: 2.5rem; text-align: center; color: var(--beui-muted-foreground); }
.beui-table .skeleton i { display: block; width: 66.667%; height: .75rem; border-radius: 999px; background: var(--beui-muted); animation: be-table-pulse 2s cubic-bezier(.4, 0, .6, 1) infinite; }
.beui-table .skeleton i[data-end] { width: 2.5rem; margin-left: auto; }
.beui-table .skeleton td { padding: 0 1rem; }
@keyframes be-table-pulse { 50% { opacity: .5; } }
@media (prefers-reduced-motion: reduce) { .beui-table .chevron, .beui-table tbody tr, .skeleton i { transition: none; animation: none; } }
</style>

<style>
/* Insert handles: a pill on the column's top border / the row's left border. Idle ones stay in the tab order but are invisible. */
.beui-table .handle { position: absolute; z-index: 40; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--beui-primary); color: var(--beui-primary-foreground); box-shadow: 0 1px 2px 0 rgb(0 0 0 / .05); opacity: 0; pointer-events: none; transform: translate(-50%, -50%); transition: background-color .15s, opacity .15s; }
.beui-table .handle[data-active], .beui-table .handle:focus-visible { position: fixed; opacity: 1; pointer-events: auto; }
.beui-table .handle:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.beui-table .column-handle { top: 0; left: 50%; width: 1.5rem; height: .5rem; }
.beui-table .row-handle { top: 50%; left: 0; width: .5rem; height: 1.5rem; }
.beui-table .handle .be-table-icon { width: .75rem; height: .75rem; flex: none; }
@media (hover: hover) { .beui-table .handle:hover { background: color-mix(in srgb, var(--beui-primary) 90%, transparent); } }
@media (prefers-reduced-motion: reduce) { .beui-table .handle { transition: none; } }
</style>

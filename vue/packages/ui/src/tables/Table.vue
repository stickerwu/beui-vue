<script setup lang="ts" generic="Row extends object">
import { computed, onMounted, shallowRef, useTemplateRef, watch, type FunctionalComponent, type VNodeChild } from 'vue'
import { field, orderColumns, sortedEntries, tableMessages, type SortState, type TableColumn, type TableProps } from './model'
import TableMenu from './TableMenu.vue'

const props = defineProps<TableProps<Row>>()
const emit = defineEmits<{
  'update:selectedRowIds': [ids: string[]]; selectionChange: [ids: string[]]
  'update:sort': [sort: SortState | null]; sortChange: [sort: SortState | null]
  columnResize: [key: string, width: number]; columnOrderChange: [keys: string[]]; endReached: []
}>()
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
const first = computed(() => Math.max(0, Math.min(rows.value.length - 1, Math.floor(top.value / rowHeight.value) - overscan.value - 1)))
const last = computed(() => Math.min(rows.value.length, Math.ceil((top.value + height.value) / rowHeight.value) + overscan.value))
const visible = computed(() => rows.value.slice(first.value, last.value))
const selectedLocal = shallowRef(new Set(props.defaultSelectedRowIds ?? []))
const selected = computed(() => props.selectedRowIds ? new Set(props.selectedRowIds) : selectedLocal.value)
const all = computed(() => rows.value.length > 0 && rows.value.every(entry => selected.value.has(entry.id)))
const some = computed(() => rows.value.some(entry => selected.value.has(entry.id)))
const widths = shallowRef<Record<string, number>>({})
const hasRowMenu = computed(() => Boolean(props.onInsertRow || props.onDeleteRow))
const hasColumnMenu = computed(() => Boolean(props.onInsertColumn || props.onDeleteColumn))
const lead = computed(() => (props.selectable ? 48 : 0) + (hasRowMenu.value ? 36 : 0))
const span = computed(() => columns.value.length + Number(Boolean(props.selectable)) + Number(hasRowMenu.value) + 1)
const pixels = computed(() => columns.value.reduce((total, column) => {
  if (widths.value[column.key]) return total + widths.value[column.key]
  const measure = Number.parseFloat(column.width ?? '')
  if (Number.isFinite(measure)) {
    if (column.width?.endsWith('px')) return total + measure
    if (column.width?.endsWith('rem')) return total + measure * rootFont.value
  }
  return total + (column.editable || props.onColumnRename ? Math.max(120, minimum.value) : minimum.value)
}, lead.value))
const sized = computed(() => columns.value.length > 0 && columns.value.every(column => widths.value[column.key]))
const loadingRows = computed(() => !rows.value.length ? Math.ceil(height.value / rowHeight.value) : Math.max(0, props.skeletonRows ?? 3))
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
  const fixed: Record<string, number> = {}
  for (const element of headerElements()) fixed[element.dataset.key!] = Math.round(element.getBoundingClientRect().width) || minimum.value
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
function menuItems(kind: 'row' | 'column', id: string, index: number) {
  const insert = kind === 'row' ? props.onInsertRow : props.onInsertColumn
  const remove = kind === 'row' ? props.onDeleteRow : props.onDeleteColumn
  const items: { label: string; action: () => void }[] = []
  if (insert) {
    items.push({ label: translate('insertBefore'), action: () => insert(index, 'before') })
    items.push({ label: translate('insertAfter'), action: () => insert(index, 'after') })
  }
  if (remove) items.push({ label: translate(kind === 'row' ? 'deleteRow' : 'deleteColumn'), action: () => remove(id, index) })
  return items
}
function columnWidth(column: TableColumn<Row>) {
  if (widths.value[column.key]) return `${widths.value[column.key]}px`
  if (!column.width || column.width.endsWith('fr')) return undefined
  return column.width
}
</script>

<template>
  <div class="beui-table" data-slot="table">
    <div ref="viewport" class="table-scroll" role="region" :aria-label="label ?? 'Data table'" tabindex="0" :style="{ height: `${height}px` }" @scroll.passive="scroll">
      <table :aria-label="label ?? 'Data table'" :aria-rowcount="rows.length + 1" :aria-busy="Boolean(loading)" :style="{ minWidth: `max(100%, ${pixels}px)`, width: sized ? `${pixels}px` : '100%', '--row-h': `${rowHeight}px` }">
        <colgroup><col v-if="selectable" style="width: 48px"><col v-if="hasRowMenu" style="width: 36px"><col v-for="column in columns" :key="column.key" :style="{ width: columnWidth(column) }"><col :style="{ width: sized ? undefined : '0px' }"></colgroup>
        <thead><tr aria-rowindex="1">
          <th v-if="selectable" scope="col" class="center"><input type="checkbox" :aria-label="translate('selectAll')" :checked="all" :indeterminate="!all && some" @change="toggleAll"></th>
          <th v-if="hasRowMenu" scope="col" aria-label="Row actions" />
          <th v-for="(column, columnIndex) in columns" :key="column.key" scope="col" :data-key="column.key" :data-drop="dropIndex === columnIndex" :aria-sort="sort?.key === column.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : undefined">
            <div class="header" :style="{ textAlign: column.align }">
              <button v-if="reorderable" type="button" class="grip" :aria-label="translate('reorderColumn', column.key)" @pointerdown="begin($event, column.key, 'order')" @pointermove="move" @pointerup="end($event)" @pointercancel="end($event, true)" @keydown="keyboard($event, column.key, 'order')">⠿</button>
              <button v-if="column.sortable" type="button" class="heading sort" @click="sortColumn(column.key)"><slot name="header" :column="column"><Content :value="column.header" /></slot><span aria-hidden="true">{{ sort?.key === column.key && sort.direction === 'desc' ? '⌄' : '⌃' }}</span></button>
              <input v-else-if="onColumnRename" class="heading inline" :aria-label="translate('renameColumn', column.key)" :value="typeof column.header === 'string' ? column.header : ''" @input="onColumnRename(column.key, ($event.currentTarget as HTMLInputElement).value)">
              <span v-else class="heading"><slot name="header" :column="column"><Content :value="column.header" /></slot></span>
              <TableMenu v-if="hasColumnMenu" :label="translate('columnOptions', column.key)" :items="menuItems('column', column.key, columnIndex)" />
              <button v-if="resizable" type="button" class="resize" :aria-label="translate('resizeColumn', column.key)" @pointerdown="begin($event, column.key, 'resize')" @pointermove="move" @pointerup="end($event)" @pointercancel="end($event, true)" @keydown="keyboard($event, column.key, 'resize')" />
            </div>
          </th><th aria-hidden="true" class="spacer" />
        </tr></thead>
        <tbody>
          <tr v-if="first > 0" aria-hidden="true" :style="{ height: `${first * rowHeight}px` }"><td :colspan="span" class="spacer" /></tr>
          <tr v-for="(entry, index) in visible" :key="entry.id" :aria-rowindex="first + index + 2" :data-selected="selected.has(entry.id)" class="data-row">
            <td v-if="selectable" class="center"><input type="checkbox" :aria-label="translate('selectRow', '', first + index + 1)" :checked="selected.has(entry.id)" @change="toggleRow(entry.id)"></td>
            <td v-if="hasRowMenu" class="center"><TableMenu :label="translate('rowOptions', '', first + index + 1)" :items="menuItems('row', entry.id, first + index)" /></td>
            <td v-for="column in columns" :key="column.key" :style="{ textAlign: column.align }">
              <slot :name="`cell-${column.key}`" :row="entry.row" :column="column" :index="first + index">
                <Content v-if="column.cell" :value="column.cell(entry.row)" />
                <input v-else-if="column.editable" class="inline" :value="field(entry.row, column.key) ?? ''" :placeholder="translate('cellPlaceholder')" :aria-label="translate('cellLabel', column.key, first + index + 1)" @input="onCellEdit?.(entry.id, column.key, ($event.currentTarget as HTMLInputElement).value)">
                <template v-else>{{ field(entry.row, column.key) }}</template>
              </slot>
            </td><td aria-hidden="true" class="spacer" />
          </tr>
          <tr v-if="last < rows.length" aria-hidden="true" :style="{ height: `${(rows.length - last) * rowHeight}px` }"><td :colspan="span" class="spacer" /></tr>
          <template v-if="loading"><tr v-for="index in loadingRows" :key="index" aria-hidden="true" class="skeleton"><td v-if="selectable" /><td v-if="hasRowMenu" /><td v-for="column in columns" :key="column.key"><i /></td><td class="spacer" /></tr></template>
          <tr v-else-if="!rows.length"><td :colspan="span" class="empty"><slot name="empty"><Content :value="emptyState ?? translate('empty')" /></slot></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.beui-table { width: 100%; min-width: 0; overflow: hidden; border: 1px solid #8884; border-radius: 12px; font-size: 14px; line-height: 1.4; }
.table-scroll { overflow: auto; overscroll-behavior: contain; }.table-scroll:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
.beui-table table { display: table; margin: 0; table-layout: fixed; border-collapse: separate; border-spacing: 0; overflow: visible; font-size: 14px; }
.beui-table th,.beui-table td { box-sizing: border-box; overflow: hidden; border: 0; border-bottom: 1px solid #8883; padding: 0 10px; white-space: nowrap; text-overflow: ellipsis; }
.beui-table tr { background: transparent; }.beui-table th { position: sticky; z-index: 1; top: 0; background: var(--vp-c-bg-soft, Canvas); height: var(--row-h); text-align: left; padding: 0 6px; }
.beui-table th[data-drop='true'] { box-shadow: inset 2px 0 currentColor; }.header { display: flex; gap: 2px; align-items: center; height: 100%; }.heading { flex: 1; min-width: 0; padding: 0 4px; overflow: hidden; text-overflow: ellipsis; }
.beui-table button,.beui-table input { font: inherit; color: inherit; }.beui-table button { cursor: pointer; background: none; border: 0; }
.beui-table .grip,.beui-table .resize { touch-action: none; user-select: none; }.beui-table .grip { cursor: grab; opacity: .65; padding: 2px; }.beui-table .resize { position: absolute; right: 0; height: 100%; width: 6px; padding: 0; cursor: col-resize; }
.resize:is(:hover,:focus-visible) { background: #8886; }.beui-table .sort { text-align: inherit; }.sort span[aria-hidden] { margin-left: 4px; }
.beui-table .center,.empty { text-align: center; }.beui-table .empty { padding: 24px; }.beui-table .spacer { border: 0; padding: 0; }
.data-row,.skeleton { height: var(--row-h); }.beui-table tr.data-row:is(:hover,[data-selected='true']) { background: #8881; }
.beui-table .inline { width: 100%; min-width: 0; box-sizing: border-box; background: transparent; border: 0; border-radius: 4px; padding: 3px; }
.beui-table :is(button,input):focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }.skeleton i { display: block; width: 65%; height: 9px; border-radius: 8px; background: #8883; }
@media (prefers-reduced-motion:no-preference) { .skeleton i { animation: beui-table-pulse 1.3s ease-in-out infinite alternate; } } @keyframes beui-table-pulse { to { opacity: .4; } }
</style>

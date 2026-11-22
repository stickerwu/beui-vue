<script setup lang="ts" generic="Row extends { id: string }">
import { computed, nextTick, provide, shallowRef, useId, useSlots, useTemplateRef, watch } from 'vue'
import SortableListGroup from './SortableListGroup.vue'
import SortableListHandle from './SortableListHandle.vue'
import SortableListItem from './SortableListItem.vue'
import SortableListItemContent from './SortableListItemContent.vue'
import SortableListUndo from './SortableListUndo.vue'
import { sortableListKey, sortableListMessages, type SortableListContext, type SortableListMessages, type SortableMoveDirection } from './sortable-list-context'

/** Compound sortable list: compose `SortableListGroup`, `SortableListItem`, `SortableListHandle`, `SortableListItemContent` and `SortableListUndo` inside, or give `renderItem` for the ready-made rows. */
const props = withDefaults(defineProps<{
  /** Starting rows when `v-model:items` is not bound. */
  defaultItems?: Row[]
  /** Screen-reader label of a row; the visible row is up to the slot. */
  getItemLabel: (item: Row) => string
  /** Accessible name of the list. */
  label?: string
  disabled?: boolean
  /** Show the automatic undo button in the convenience composition. */
  showUndo?: boolean
  /** Extra classes for every row. */
  itemClassName?: string
  /** Override any built-in string. */
  labels?: Partial<SortableListMessages>
}>(), { defaultItems: () => [], disabled: false, showUndo: true })

/** Rows in their current order, `v-model:items`. */
const model = defineModel<Row[]>('items')
defineSlots<{
  /** Compose the parts; receives the items in their current order. Omit it to use `renderItem`. */
  default?: (props: { items: Row[] }) => unknown
  /** Row contents for the convenience composition when the default slot is omitted. */
  renderItem?: (props: { item: Row; index: number }) => unknown
}>()

const slots = useSlots()
const t = computed(() => ({ ...sortableListMessages, ...props.labels }))
const label = computed(() => props.label ?? t.value.label)
const instructionsId = useId()
const root = useTemplateRef<HTMLDivElement>('root')

// `live` is the array every action reads from, so a reorder still resolves
// before the parent's prop round-trips.
const live = shallowRef<Row[]>(model.value ?? props.defaultItems)
watch(model, next => { if (next) live.value = next })
const ids = computed(() => live.value.map(item => item.id))
const labels = computed(() => new Map(live.value.map(item => [item.id, props.getItemLabel(item)] as const)))
watch(ids, list => {
  if (new Set(list).size !== list.length) throw new Error('SortableList requires unique item ids.')
}, { immediate: true })
if (!slots.default && !slots.renderItem) throw new Error('SortableList requires a default slot or a renderItem slot.')

const announcement = shallowRef('')
const previous = shallowRef<string[] | null>(null)
const lifted = shallowRef<string | null>(null)
let dragStart: string[] | null = null
let liftStart: string[] | null = null

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}
function announceMove(item: Row, index: number, total: number) {
  announcement.value = fill(t.value.moved, { item: props.getItemLabel(item), position: index + 1, total })
}
function change(next: Row[]) {
  live.value = next
  model.value = next
}
// Consumers can remove rows during a drag. Only publish a full permutation.
function reorder(nextIds: string[]) {
  if (props.disabled) return
  const byId = new Map(live.value.map(item => [item.id, item] as const))
  const next = nextIds.flatMap(id => {
    const item = byId.get(id)
    return item ? [item] : []
  })
  if (next.length === live.value.length && new Set(nextIds).size === next.length) change(next)
}
function move(id: string, direction: SortableMoveDirection) {
  const current = live.value
  const from = current.findIndex(item => item.id === id)
  const to = direction === 'first' ? 0 : direction === 'last' ? current.length - 1 : from + direction
  if (props.disabled || from < 0 || to < 0 || to >= current.length || from === to) return
  const next = [...current]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  previous.value = current.map(row => row.id)
  change(next)
  announceMove(item!, to, current.length)
}
// A removed row makes the stored order meaningless; a lift on a row that went away ends.
watch(ids, list => {
  const before = previous.value
  if (before && (before.length !== list.length || before.some(id => !list.includes(id)))) previous.value = null
  if (lifted.value !== null && !list.includes(lifted.value)) { lifted.value = null; liftStart = null }
})
const canUndo = computed(() => {
  const before = previous.value
  if (!before || before.length !== ids.value.length) return false
  return before.every(id => ids.value.includes(id)) && before.some((id, index) => id !== ids.value[index])
})
function focusHandle(id: string) {
  nextTick(() => {
    root.value
      ?.querySelector<HTMLButtonElement>(`button[data-sortable-id="${CSS.escape(id)}"]`)
      ?.focus({ preventScroll: true })
  })
}
function undo() {
  const before = previous.value
  if (props.disabled || !before || !canUndo.value) return
  const target = before.find((id, index) => id !== ids.value[index]) ?? before[0]
  previous.value = null
  reorder(before)
  announcement.value = t.value.restored
  if (target) focusHandle(target)
}
function beginDrag() { dragStart = live.value.map(item => item.id) }
function finishDrag(id: string) {
  const before = dragStart
  dragStart = null
  const current = live.value
  const index = current.findIndex(item => item.id === id)
  const item = current[index]
  if (item && before?.some((oldId, at) => oldId !== current[at]?.id)) {
    previous.value = before
    announceMove(item, index, current.length)
  }
}
// Space lifts a row and Escape puts it back where it started; arrows, Home and End move immediately.
function lift(id: string) {
  if (lifted.value === id) { lifted.value = null; liftStart = null; return }
  lifted.value = id
  liftStart = live.value.map(item => item.id)
}
function cancelLift() {
  const before = liftStart
  const id = lifted.value
  lifted.value = null
  liftStart = null
  if (!before || !id) return
  reorder(before)
  announcement.value = t.value.restored
  focusHandle(id)
}

const context: SortableListContext = {
  ids, labels, label, disabled: computed(() => props.disabled), instructionsId,
  itemClassName: computed(() => props.itemClassName), t, fill, canUndo, lifted,
  reorder, move, undo, lift, cancelLift, beginDrag, finishDrag, focusHandle,
}
provide(sortableListKey, context)
</script>

<template>
  <div ref="root" class="be-sortable-list">
    <p :id="instructionsId" class="be-sortable-list-sr">{{ t.instructions }}</p>
    <slot v-if="$slots.default" :items="live" />
    <template v-else>
      <SortableListGroup :aria-label="label">
        <SortableListItem v-for="(item, index) in live" :id="item.id" :key="item.id">
          <SortableListHandle />
          <SortableListItemContent>
            <slot name="renderItem" :item="item" :index="index" />
          </SortableListItemContent>
        </SortableListItem>
      </SortableListGroup>
      <SortableListUndo v-if="showUndo" />
    </template>
    <span role="status" aria-live="polite" class="be-sortable-list-sr">{{ announcement }}</span>
  </div>
</template>

<style>
.be-sortable-list { width: 100%; max-width: 28rem; color: var(--beui-foreground); }
.be-sortable-list-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>

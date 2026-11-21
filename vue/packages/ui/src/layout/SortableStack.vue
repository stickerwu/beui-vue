<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const sortableStackMessages = {
  label: 'Sortable items',
  instructions:
    'Drag a handle to reorder. With a handle focused, use Up and Down to move, Home and End to move to the edges. Space lifts a row and drops it again, and Escape cancels the lift.',
  moved: '{item} moved to position {position} of {total}.',
  restored: 'Previous order restored.',
  reorder: 'Reorder {item}',
  undo: 'Undo reorder',
}
export type SortableStackMessages = typeof sortableStackMessages
</script>

<script setup lang="ts" generic="Row extends { id: string; title: string; detail?: string }">
import { ReorderGroup, ReorderItem, useDragControls } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { layoutSpring } from '../core/motion'

type MoveDirection = -1 | 1 | 'first' | 'last'

const props = withDefaults(defineProps<{
  /** Accessible name of the list. */
  label?: string
  /** Width/box helpers for the root wrapper. */
  className?: string
  /** Extra classes for every row. */
  itemClassName?: string
  disabled?: boolean
  /** Show the automatic undo button under the list. */
  showUndo?: boolean
  /** Screen-reader label of a row; the visible row is up to the slot. */
  getItemLabel?: (item: Row) => string
  labels?: Partial<SortableStackMessages>
}>(), { showUndo: true })

const items = defineModel<Row[]>({ required: true })
const emit = defineEmits<{ itemsChange: [items: Row[]] }>()
defineSlots<{
  default?: (props: { item: Row; index: number; dragging: boolean }) => unknown
  handle?: (props: { item: Row; index: number }) => unknown
  undo?: () => unknown
}>()

const reduce = useReducedMotion()
const t = computed(() => ({ ...sortableStackMessages, ...props.labels }))
const ariaLabel = computed(() => props.label ?? t.value.label)
const instructionsId = useId()
const root = useTemplateRef<HTMLDivElement>('root')

// Drag lift and the frozen transition under reduced motion, straight from the
// original `whileDrag` / `{ duration: 0 }` pair.
const DRAG_LIFT = { scale: 1.025 } as const
const INSTANT = { duration: 0 } as const

// `items` is the parent's value; `live` is the array every action reads from,
// so a reorder still resolves correctly before the parent's prop round-trips.
const live = shallowRef<Row[]>(items.value)
const ids = computed(() => live.value.map(item => item.id))
const announcement = shallowRef('')
const previous = shallowRef<string[] | null>(null)
const dragging = shallowRef<string | null>(null)
const lifted = shallowRef<string | null>(null)
let dragStart: string[] | null = null
let liftStart: string[] | null = null

watch(items, next => { live.value = next })

function labelOf(item: Row) {
  return props.getItemLabel?.(item) ?? item.title
}
function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''))
}
function announceMove(item: Row, index: number, total: number) {
  announcement.value = fill(t.value.moved, { item: labelOf(item), position: index + 1, total })
}

function change(next: Row[]) {
  live.value = next
  items.value = next
  emit('itemsChange', next)
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

function move(id: string, direction: MoveDirection) {
  const current = live.value
  const from = current.findIndex(item => item.id === id)
  const to = direction === 'first'
    ? 0
    : direction === 'last'
      ? current.length - 1
      : from + direction
  if (props.disabled || from < 0 || to < 0 || to >= current.length || from === to) return
  const next = [...current]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  previous.value = current.map(row => row.id)
  change(next)
  announceMove(item!, to, current.length)
}

// A removed row makes the stored order meaningless; drop it rather than let
// rows that come back revive it. A lift on a row that went away also ends.
watch(ids, list => {
  const before = previous.value
  if (before && (before.length !== list.length || before.some(id => !list.includes(id))))
    previous.value = null
  if (lifted.value !== null && !list.includes(lifted.value)) {
    lifted.value = null
    liftStart = null
  }
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

function beginDrag(id: string) {
  dragging.value = id
  dragStart = live.value.map(item => item.id)
}
function finishDrag(id: string) {
  const before = dragStart
  dragStart = null
  dragging.value = null
  const current = live.value
  const index = current.findIndex(item => item.id === id)
  const item = current[index]
  if (item && before?.some((oldId, at) => oldId !== current[at]?.id)) {
    previous.value = before
    announceMove(item, index, current.length)
  }
}

// motion-v's `useDragControls` is a plain factory (one instance per handle),
// so an id-keyed cache is enough; it is stable for the row's lifetime.
const controlsById = new Map<string, ReturnType<typeof useDragControls>>()
function controlsFor(id: string) {
  let controls = controlsById.get(id)
  if (!controls) {
    controls = useDragControls()
    controlsById.set(id, controls)
  }
  return controls
}
watch(ids, list => {
  for (const id of controlsById.keys()) if (!list.includes(id)) controlsById.delete(id)
})

function onHandlePointerDown(event: PointerEvent, id: string) {
  if (event.defaultPrevented || props.disabled || event.button !== 0) return
  ;(event.currentTarget as HTMLButtonElement | null)?.focus({ preventScroll: true })
  controlsFor(id).start(event)
}

// Space lifts a row and Escape puts it back where it started (the documented
// Vue behaviour); arrows, Home and End move immediately like the original.
function lift(id: string) {
  if (lifted.value === id) {
    lifted.value = null
    liftStart = null
    return
  }
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

function onHandleKeydown(event: KeyboardEvent, id: string) {
  if (event.defaultPrevented || props.disabled || event.altKey || event.ctrlKey || event.metaKey) return
  if (event.key === ' ') {
    event.preventDefault()
    if (!event.repeat) lift(id)
    return
  }
  if (event.key === 'Escape' && lifted.value === id) {
    event.preventDefault()
    cancelLift()
    return
  }
  const direction: MoveDirection | null =
    event.key === 'ArrowUp'
      ? -1
      : event.key === 'ArrowDown'
        ? 1
        : event.key === 'Home'
          ? 'first'
          : event.key === 'End'
            ? 'last'
            : null
  if (direction === null) return
  event.preventDefault()
  move(id, direction)
  // Reordering detaches and reattaches the row, which blurs its handle in a
  // real browser; the row keeps the focus it had before the key.
  focusHandle(id)
}
</script>

<template>
  <div ref="root" class="be-sortable" :class="className">
    <p :id="instructionsId" class="be-sortable-sr">{{ t.instructions }}</p>
    <ReorderGroup
      axis="y" :values="ids" :aria-label="ariaLabel" class="be-sortable-group"
      @update:values="reorder">
      <ReorderItem
        v-for="(item, index) in live" :key="item.id" :value="item.id" tabindex="-1"
        layout="position" :drag-listener="false" :drag-controls="controlsFor(item.id)"
        :animate="reduce ? undefined : { scale: lifted === item.id ? DRAG_LIFT.scale : 1 }"
        :transition="reduce ? INSTANT : layoutSpring" :while-drag="reduce ? undefined : DRAG_LIFT"
        :aria-posinset="index + 1" :aria-setsize="live.length"
        class="be-sortable-item"
        :class="[itemClassName, (dragging === item.id || lifted === item.id) && 'be-sortable-dragging']"
        @drag-start="beginDrag(item.id)"
        @drag-end="finishDrag(item.id)">
        <button
          type="button" class="be-sortable-handle" :disabled="disabled" :data-sortable-id="item.id"
          :aria-label="fill(t.reorder, { item: labelOf(item) })" :aria-describedby="instructionsId"
          :aria-pressed="lifted === item.id ? true : undefined"
          :style="{ cursor: disabled ? undefined : dragging === item.id ? 'grabbing' : 'grab' }"
          @pointerdown="onHandlePointerDown($event, item.id)"
          @keydown="onHandleKeydown($event, item.id)">
          <slot name="handle" :item="item" :index="index">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" />
              <circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />
            </svg>
          </slot>
        </button>
        <div class="be-sortable-content">
          <slot :item="item" :index="index" :dragging="dragging === item.id || lifted === item.id">
            <div class="be-sortable-default">
              <div class="be-sortable-copy">
                <strong class="be-sortable-title">{{ item.title }}</strong>
                <small v-if="item.detail" class="be-sortable-detail">{{ item.detail }}</small>
              </div>
              <span class="be-sortable-position" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
            </div>
          </slot>
        </div>
      </ReorderItem>
    </ReorderGroup>
    <button
      v-if="showUndo" type="button" class="be-sortable-undo" :disabled="disabled || !canUndo"
      @click="undo">
      <slot name="undo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
        </svg>
        {{ t.undo }}
      </slot>
    </button>
    <span role="status" aria-live="polite" class="be-sortable-sr">{{ announcement }}</span>
  </div>
</template>

<style scoped>
.be-sortable { width: 100%; max-width: 28rem; color: var(--beui-foreground); }
.be-sortable-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.be-sortable-group { margin: 0; padding: 0; list-style: none; }
.be-sortable-item { position: relative; display: flex; align-items: center; gap: .75rem; margin: 0; padding: .75rem; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); list-style: none; }
/* Tailwind `space-y-2`: siblings only, so the first row keeps no top margin. */
.be-sortable-item + .be-sortable-item { margin-top: .5rem; }
.be-sortable-dragging { box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
.be-sortable-handle { display: flex; width: 2.25rem; height: 2.25rem; flex: none; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; touch-action: none; }
.be-sortable-handle:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.be-sortable-handle:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--beui-ring); }
.be-sortable-handle:disabled { cursor: not-allowed; opacity: .4; }
.be-sortable-handle svg { width: 18px; height: 18px; }
.be-sortable-content { display: flex; min-width: 0; flex: 1; align-items: center; gap: .75rem; }
.be-sortable-default { display: flex; width: 100%; min-width: 0; align-items: center; gap: .75rem; }
.be-sortable-copy { min-width: 0; flex: 1; }
.be-sortable-title { display: block; font-size: .875rem; font-weight: 500; }
.be-sortable-detail { display: block; margin-top: .125rem; color: var(--beui-muted-foreground); font-size: .75rem; }
.be-sortable-position { margin-inline-start: auto; color: var(--beui-muted-foreground); font-size: .625rem; font-variant-numeric: tabular-nums; }
.be-sortable-undo { display: inline-flex; align-items: center; gap: .375rem; margin-top: 1rem; padding: .25rem .5rem; border: 0; border-radius: .375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; transition: color .15s ease; }
.be-sortable-undo:hover { color: var(--beui-foreground); }
.be-sortable-undo:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--beui-ring); }
.be-sortable-undo:disabled { opacity: .4; }
.be-sortable-undo svg { width: 13px; height: 13px; }
</style>

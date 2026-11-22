<script setup lang="ts">
import { computed, inject } from 'vue'
import { sortableItemKey, useSortableListContext, type SortableMoveDirection } from './sortable-list-context'

/** The drag handle button: pointer drag, plus arrow keys, Home and End, and Space to lift. */
const props = defineProps<{ disabled?: boolean }>()
defineSlots<{
  /** Replaces the grip icon. */
  default?: () => unknown
}>()

const context = useSortableListContext('SortableListHandle')
const item = inject(sortableItemKey, null)
if (!item) throw new Error('SortableListHandle must be used within SortableListItem.')
const unavailable = computed(() => props.disabled || context.disabled.value)
const lifted = computed(() => context.lifted.value === item.id)

function onPointerDown(event: PointerEvent) {
  if (event.defaultPrevented || unavailable.value || event.button !== 0) return
  ;(event.currentTarget as HTMLButtonElement | null)?.focus({ preventScroll: true })
  item!.controls.start(event)
}
function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || unavailable.value || event.altKey || event.ctrlKey || event.metaKey) return
  if (event.key === ' ') {
    event.preventDefault()
    if (!event.repeat) context.lift(item!.id)
    return
  }
  if (event.key === 'Escape' && lifted.value) {
    event.preventDefault()
    context.cancelLift()
    return
  }
  const direction: SortableMoveDirection | null =
    event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : null
  if (direction === null) return
  event.preventDefault()
  context.move(item!.id, direction)
  // Reordering detaches and reattaches the row, which blurs its handle in a real browser.
  context.focusHandle(item!.id)
}
</script>

<template>
  <button
    type="button" class="be-sortable-list-handle" :disabled="unavailable" :data-sortable-id="item.id"
    :aria-label="context.fill(context.t.value.reorder, { item: item.label.value })"
    :aria-describedby="context.instructionsId"
    :aria-pressed="lifted ? true : undefined"
    :style="{ cursor: unavailable ? undefined : item.dragging.value ? 'grabbing' : 'grab' }"
    @pointerdown="onPointerDown" @keydown="onKeydown">
    <slot>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />
      </svg>
    </slot>
  </button>
</template>

<style>
.be-sortable-list-handle { display: flex; width: 2.25rem; height: 2.25rem; flex: none; align-items: center; justify-content: center; padding: 0; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; touch-action: none; }
.be-sortable-list-handle:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.be-sortable-list-handle:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--beui-ring); }
.be-sortable-list-handle:disabled { cursor: not-allowed; opacity: .4; }
.be-sortable-list-handle svg { width: 18px; height: 18px; }
</style>

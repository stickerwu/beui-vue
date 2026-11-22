<script setup lang="ts">
import { ReorderItem, useDragControls } from 'motion-v'
import { computed, provide, shallowRef } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { layoutSpring } from '../core/motion'
import { sortableItemKey, useSortableListContext } from './sortable-list-context'

const props = defineProps<{
  /** Identity of an item supplied to the root. Use it as the `v-for` key too. */
  id: string
}>()
defineSlots<{ default?: () => unknown }>()

const context = useSortableListContext('SortableListItem')
const reduce = useReducedMotion()
const controls = useDragControls()
const dragging = shallowRef(false)
const label = computed(() => {
  const found = context.labels.value.get(props.id)
  if (found === undefined) throw new Error(`SortableListItem ${props.id} is not present in the root items.`)
  return found
})
// Touch the label once so a missing id fails loudly at setup, like the original.
void label.value

// Drag lift and the frozen transition under reduced motion, straight from the original pair.
const DRAG_LIFT = { scale: 1.025 } as const
const INSTANT = { duration: 0 } as const

provide(sortableItemKey, { id: props.id, label, controls, dragging })
const position = computed(() => context.ids.value.indexOf(props.id) + 1)
const isLifted = computed(() => context.lifted.value === props.id)
</script>

<template>
  <ReorderItem
    :value="id" tabindex="-1" layout="position" :drag-listener="false" :drag-controls="controls"
    :animate="reduce ? undefined : { scale: isLifted ? DRAG_LIFT.scale : 1 }"
    :transition="reduce ? INSTANT : layoutSpring" :while-drag="reduce ? undefined : DRAG_LIFT"
    :aria-posinset="position" :aria-setsize="context.ids.value.length"
    class="be-sortable-list-item"
    :class="[context.itemClassName.value, (dragging || isLifted) && 'be-sortable-list-dragging']"
    @drag-start="dragging = true; context.beginDrag()"
    @drag-end="dragging = false; context.finishDrag(id)">
    <slot />
  </ReorderItem>
</template>

<style>
.be-sortable-list-item { position: relative; display: flex; align-items: center; gap: .75rem; margin: 0; padding: .75rem; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); list-style: none; }
/* Tailwind `space-y-2`: siblings only, so the first row keeps no top margin. */
.be-sortable-list-item + .be-sortable-list-item { margin-top: .5rem; }
.be-sortable-list-dragging { box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
</style>

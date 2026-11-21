<script setup lang="ts">
import { useReducedMotion } from '../../core/reduced-motion'
import { computed, onBeforeUnmount, provide, shallowRef, useId, watch } from 'vue'
import ContextMenuContent from './ContextMenuContent.vue'
import ContextMenuTrigger from './ContextMenuTrigger'
import ContextItemsView from './ContextItemsView.vue'
import { contextKey, contextMenuMessages, type ContextMenuMessages, type OpenModality } from './context-shared'
import type { Point } from './menu-shared'
import type { MenuItemSpec } from './menu-types'
import './menu.css'

// Compound API (ContextMenuTrigger + ContextMenuContent + rows) like the React
// source, or `items` for the data-driven form where the slot is the target.
const props = withDefaults(defineProps<{
  items?: readonly MenuItemSpec[]
  /** Accessible name of the menu. Overrides `labels.label`. */
  label?: string
  labels?: Partial<ContextMenuMessages>
  open?: boolean
  defaultOpen?: boolean
}>(), { items: undefined, label: undefined, labels: undefined, open: undefined })
const emit = defineEmits<{ select: [item: MenuItemSpec]; 'update:open': [open: boolean] }>()

const internal = shallowRef(props.defaultOpen ?? false)
const isOpen = computed(() => props.open ?? internal.value)
const point = shallowRef<Point>({ x: 0, y: 0 })
const modality = shallowRef<OpenModality>('pointer')
const invocation = shallowRef(0)
const activeId = shallowRef<string | null>(null)
const triggerEl = shallowRef<HTMLElement | null>(null)
const contentEl = shallowRef<HTMLElement | null>(null)
const menuId = useId()
const reduced = useReducedMotion()
const reduce = computed(() => Boolean(reduced.value))
const t = computed(() => ({ ...contextMenuMessages, ...props.labels }))
const label = computed(() => props.label ?? t.value.label)

function setOpen(next: boolean) {
  internal.value = next
  emit('update:open', next)
  if (!next) activeId.value = null
}
function openAt(next: Point, nextModality: OpenModality) {
  point.value = next
  modality.value = nextModality
  invocation.value += 1
  activeId.value = null
  setOpen(true)
}

// A click elsewhere, a resize or a page scroll dismisses the menu.
watch(isOpen, (now, _prev, cleanup) => {
  if (!now) return
  const onPointerDown = (event: PointerEvent) => { if (!contentEl.value?.contains(event.target as Node)) setOpen(false) }
  const onWindowChange = () => setOpen(false)
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange)
  cleanup(() => {
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('resize', onWindowChange)
    window.removeEventListener('scroll', onWindowChange)
  })
}, { immediate: true })
onBeforeUnmount(() => { activeId.value = null })

provide(contextKey, {
  open: isOpen, setOpen, openAt, point, modality, invocation, menuId, triggerEl, contentEl, activeId,
  setActiveId(id) { activeId.value = id }, reduce, label,
})
</script>

<template>
  <template v-if="items">
    <ContextMenuTrigger>
      <button type="button" class="be-ctx-target"><slot /></button>
    </ContextMenuTrigger>
    <ContextMenuContent :aria-label="label"><ContextItemsView :items="items" @select="emit('select', $event)" /></ContextMenuContent>
  </template>
  <slot v-else />
</template>

<style>
.be-ctx-target { display: inline-flex; flex-direction: column; align-items: center; border: 0; border-radius: 0.6rem; background: none; padding: 0.5rem; color: inherit; font: inherit; cursor: default; outline: none; touch-action: pan-y; }
.be-ctx-target:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>

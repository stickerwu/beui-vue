<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, onBeforeUnmount, useId } from 'vue'
import { layoutSpring } from '../../core/motion'
import { SUB_GRACE, SUB_OPEN_DELAY, enabledItems, insidePolygon, useLevel, useRoot, type SubContext } from './menu-shared'
import './menu.css'

// One row. The submenu trigger is the same row with `sub` wired in. Port of
// `ItemBase` and `DropdownMenuSubTrigger` in `components/motion/dropdown-menu.tsx`.
const props = withDefaults(defineProps<{
  disabled?: boolean
  closeOnSelect?: boolean
  tone?: 'default' | 'destructive'
  inset?: boolean
  textValue?: string
  role?: 'menuitem' | 'menuitemcheckbox' | 'menuitemradio'
  checked?: boolean
  sub?: SubContext
}>(), { closeOnSelect: true, tone: 'default', role: 'menuitem', checked: undefined, sub: undefined })
const emit = defineEmits<{ select: [] }>()

const root = useRoot('DropdownMenuItem')
const level = useLevel('DropdownMenuItem')
const ownId = useId()
const id = computed(() => props.sub?.id ?? ownId)
const active = computed(() => level.activeId.value === id.value)
let timer: ReturnType<typeof setTimeout> | undefined
function clearTimer() { if (timer) clearTimeout(timer); timer = undefined }
onBeforeUnmount(clearTimer)

function onFocus() {
  level.setActiveId(id.value)
  // Moving to another row of this menu closes a submenu it does not own.
  if (level.openSub.value && level.openSub.value !== props.sub?.id) level.setOpenSub(null)
}

function subPointerMove(event: PointerEvent) {
  const sub = props.sub!
  const row = event.currentTarget as HTMLElement
  if (document.activeElement !== row) row.focus({ preventScroll: true })
  if (props.disabled || sub.open.value || timer) return
  // Another row's submenu closes as soon as the pointer settles here.
  if (level.openSub.value) level.setOpenSub(null)
  timer = setTimeout(() => { timer = undefined; sub.setOpen(true, 'none') }, SUB_OPEN_DELAY)
}

function onPointermove(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  // On the way to an open submenu, crossing this row changes nothing.
  const grace = level.grace.current
  if (grace && Date.now() < grace.until && insidePolygon({ x: event.clientX, y: event.clientY }, grace.polygon)) return
  level.grace.current = null
  if (props.sub) { subPointerMove(event); return }
  if (level.openSub.value) level.setOpenSub(null)
  const row = event.currentTarget as HTMLElement
  if (props.disabled) {
    const panel = level.panelEl.value
    if (panel?.contains(document.activeElement)) panel.focus({ preventScroll: true })
    return
  }
  if (document.activeElement !== row) row.focus({ preventScroll: true })
}

function onPointerleave(event: PointerEvent) {
  const sub = props.sub
  if (!sub) return
  clearTimer()
  const panel = sub.panelEl.value
  if (!sub.open.value || !panel || event.pointerType === 'touch') return
  // Leave a corridor from the pointer to the submenu's near edge, so a
  // diagonal path across the rows below does not close it.
  const rect = panel.getBoundingClientRect()
  const right = rect.left >= event.clientX
  const edge = right ? rect.left : rect.right
  const back = right ? -5 : 5
  level.grace.current = {
    polygon: [{ x: event.clientX + back, y: event.clientY }, { x: edge, y: rect.top }, { x: edge, y: rect.bottom }],
    until: Date.now() + SUB_GRACE,
  }
}

function onKeydown(event: KeyboardEvent) {
  const sub = props.sub
  if (!sub || props.disabled) return
  if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    event.stopPropagation()
    sub.setOpen(true, 'first')
    // Already open from a hover: the panel's focus effect will not run again,
    // so hand focus in here.
    if (sub.open.value) enabledItems(sub.panelEl.value)[0]?.focus()
  }
}

function onClick() {
  if (props.disabled) return
  if (props.sub) { props.sub.setOpen(true, 'first'); return }
  emit('select')
  if (props.closeOnSelect) root.setOpen(false)
}

function setRef(node: unknown) {
  if (props.sub) props.sub.triggerEl.value = (node as HTMLElement | null)
}
</script>

<template>
  <button
    :ref="setRef" :id="id" type="button" :role="role" :aria-checked="role === 'menuitem' ? undefined : checked"
    :aria-haspopup="sub ? 'menu' : undefined" :aria-expanded="sub ? sub.open.value : undefined" :aria-controls="sub?.open.value ? sub.contentId : undefined"
    :aria-disabled="disabled || undefined" tabindex="-1" class="be-menu-item" data-menu-item="" :data-level="level.levelId"
    :data-disabled="disabled ? '' : undefined" :data-highlighted="active ? '' : undefined" :data-text-value="textValue"
    :data-tone="tone" :data-inset="inset ? '' : undefined"
    @focus="onFocus" @pointermove="onPointermove" @pointerleave="onPointerleave" @keydown="onKeydown" @click="onClick"
  >
    <motion.span
      v-if="active && !disabled" aria-hidden="true" :layout-id="`${level.levelId}-highlight`" class="be-menu-highlight"
      :transition="root.reduce.value ? { duration: 0 } : layoutSpring"
    />
    <slot />
  </button>
</template>

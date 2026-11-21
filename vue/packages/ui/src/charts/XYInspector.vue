<script setup lang="ts">
import { computed } from 'vue'

/**
 * One invisible native range over the plot: a single tab stop for keyboard and assistive technology,
 * with pointer hit testing that matches the drawn marks. Port of upstream `XYInspector`.
 */
const { count, activeIndex, label, valueText, mode, orientation = 'horizontal', open, describedBy, canHover } = defineProps<{
  count: number
  activeIndex: number
  label: string
  valueText: (index: number) => string
  /** `point` snaps to the nearest sample (lines); `band` to the slot under the pointer (bars). */
  mode: 'point' | 'band'
  /** `vertical` reads categories top to bottom, for horizontal bars. */
  orientation?: 'horizontal' | 'vertical'
  open: boolean
  describedBy?: string
  canHover: boolean
}>()
const emit = defineEmits<{ active: [index: number]; 'update:open': [open: boolean]; touchChange: [touching: boolean] }>()

let pointerDriven = false as boolean
let focused = false as boolean
// Focus from a mouse click is incidental: it must not pin the tooltip open once the pointer leaves.
let mouseFocus = false as boolean
let last: number | null = null
const index = computed(() => activeIndex >= 0 ? activeIndex : count - 1)
const vertical = computed(() => orientation === 'vertical')

function inspectPointer(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const length = vertical.value ? bounds.height : bounds.width
  if (!length || !count) return
  const offset = vertical.value ? event.clientY - bounds.top : event.clientX - bounds.left
  const fraction = Math.min(1, Math.max(0, offset / length))
  const next = mode === 'point' ? Math.round(fraction * (count - 1)) : Math.min(count - 1, Math.floor(fraction * count))
  emit('active', next)
  if (last !== next) emit('update:open', true)
  last = next
}
function step(next: number) {
  emit('active', Math.min(count - 1, Math.max(0, next)))
  emit('update:open', true)
}
function keydown(event: KeyboardEvent) {
  pointerDriven = false
  mouseFocus = false
  if (event.key === 'Escape') emit('update:open', false)
  else if (vertical.value && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    // Categories read top to bottom, so Down moves down the list.
    event.preventDefault()
    step(index.value + (event.key === 'ArrowDown' ? 1 : -1))
  } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) emit('update:open', true)
}
</script>

<template>
  <input v-if="count" type="range" class="xy-inspector" :aria-label="label" :aria-orientation="orientation" min="0" :max="count - 1" step="1" :value="index"
    :aria-valuetext="valueText(index)" :aria-describedby="open && activeIndex >= 0 ? describedBy : undefined"
    @focus="focused = true; if (!pointerDriven) step(index)"
    @blur="focused = false; mouseFocus = false; pointerDriven = false; emit('update:open', false)"
    @pointerenter="canHover && $event.pointerType !== 'touch' && inspectPointer($event)"
    @pointermove="($event.pointerType === 'touch' ? $event.buttons === 1 : canHover || $event.buttons === 1) && inspectPointer($event)"
    @pointerleave="last = null; if (!focused || pointerDriven || ($event.pointerType !== 'touch' && mouseFocus)) emit('update:open', false)"
    @pointerdown="pointerDriven = true; $event.pointerType === 'touch' ? emit('touchChange', true) : (mouseFocus = true); last = null; inspectPointer($event)"
    @pointerup="$event.pointerType === 'touch' && emit('touchChange', false)"
    @pointercancel="pointerDriven = false; $event.pointerType === 'touch' && emit('touchChange', false); emit('update:open', false)"
    @click="pointerDriven = false" @keydown="keydown"
    @input="!pointerDriven && step(Number(($event.target as HTMLInputElement).value))" />
</template>

<style scoped>
.xy-inspector { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: crosshair; touch-action: pan-y; }
</style>

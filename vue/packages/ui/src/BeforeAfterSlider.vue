<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from './core/reduced-motion'
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useComparisonMotion } from './core/comparison-motion'
import { pressSpring } from './core/motion'
import { useMountedMedia } from './core/mounted-media'

const { modelValue, defaultValue = 50, showLabels = true, hint = true, disabled = false, labels } = defineProps<{
  modelValue?: number; defaultValue?: number; showLabels?: boolean; hint?: boolean; disabled?: boolean
  labels?: { label?: string; before?: string; after?: string; valueText?: string }
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number]; valueChange: [value: number] }>()
defineSlots<{
  /** Shown on the left of the divider, usually an image. */
  before(): unknown
  /** Shown on the right of the divider, usually an image of the same size. */
  after(): unknown
}>()
const clamp = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 50
const internal = shallowRef(clamp(defaultValue))
const current = computed(() => clamp(modelValue ?? internal.value))
const frame = useTemplateRef('frame')
const input = useTemplateRef('input')
const reduce = useReducedMotion()
const dragging = shallowRef(false)
// Hover only counts on a true hover device: touch fires a sticky phantom hover.
const hoverCapable = useMountedMedia('(hover: hover) and (pointer: fine)')
const hovered = shallowRef(false)
// Each chevron moves out from the centre as the handle is hovered and grabbed.
const split = computed(() => (reduce.value ? 0 : dragging.value ? 3 : hovered.value ? 1.5 : 0))
const { clipPath, line, dividerX, position, beforeOpacity, afterOpacity, stopHint, glide } = useComparisonMotion(frame, current, reduce, () => hint && !disabled)
type Gesture = { id: number; startX: number; startY: number; offset: number; bounds: DOMRect; active: boolean }
let gesture: Gesture | undefined

function commit(raw: number, smooth: boolean) {
  const value = Math.round(clamp(raw) * 100) / 100
  if (value === current.value) return
  glide(smooth)
  if (modelValue === undefined) internal.value = value
  emit('update:modelValue', value)
  emit('valueChange', value)
}
function dragTo(event: PointerEvent, currentGesture: Gesture, smooth: boolean) {
  commit((event.clientX - currentGesture.bounds.left - currentGesture.offset) / currentGesture.bounds.width * 100, smooth)
}
function capture(event: PointerEvent, currentGesture: Gesture) {
  currentGesture.active = true
  dragging.value = true
  const element = event.currentTarget as HTMLDivElement
  if (element.hasPointerCapture(event.pointerId) || event.isTrusted) element.setPointerCapture(event.pointerId)
  input.value?.focus({ preventScroll: true })
}
function start(event: PointerEvent) {
  if (disabled || event.button !== 0 || gesture || !frame.value) return
  stopHint()
  const bounds = frame.value.getBoundingClientRect()
  if (!bounds.width) return
  const fromHandle = event.clientX - bounds.left - position.get() / 100 * bounds.width
  gesture = { id: event.pointerId, bounds, startX: event.clientX, startY: event.clientY, offset: Math.abs(fromHandle) <= 20 ? fromHandle : 0, active: false }
  if (event.pointerType === 'touch') return
  event.preventDefault()
  capture(event, gesture)
  if (Math.abs(fromHandle) > 20) dragTo(event, gesture, true)
}
function move(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.id || disabled) return
  if (!gesture.active) {
    const horizontal = Math.abs(event.clientX - gesture.startX)
    const vertical = Math.abs(event.clientY - gesture.startY)
    if (Math.max(horizontal, vertical) < 6) return
    if (vertical >= horizontal) { gesture = undefined; return }
    capture(event, gesture)
  }
  dragTo(event, gesture, false)
}
function end(event: PointerEvent) {
  if (!gesture || event.pointerId !== gesture.id) return
  if (event.type === 'lostpointercapture' && event.target !== event.currentTarget) return
  const last = gesture
  gesture = undefined
  dragging.value = false
  if (!last.active && event.type === 'pointerup' && !disabled) dragTo(event, last, true)
  if (frame.value?.hasPointerCapture(event.pointerId)) frame.value.releasePointerCapture(event.pointerId)
}
function keydown(event: KeyboardEvent) {
  if (disabled) return
  const step = event.shiftKey ? 10 : 1
  const value = current.value
  const keys: Record<string, number> = { ArrowRight: value + step, ArrowUp: value + step, ArrowLeft: value - step, ArrowDown: value - step, PageUp: value + 10, PageDown: value - 10, Home: 0, End: 100 }
  const next = keys[event.key]
  if (next === undefined) return
  event.preventDefault()
  stopHint()
  commit(next, true)
}
</script>

<template>
  <div ref="frame" class="be-comparison" :data-dragging="dragging" :data-disabled="disabled" @dragstart.prevent @pointerdown="start" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture="end">
    <div class="be-layer"><slot name="after" /></div>
    <motion.div class="be-layer" :style="{ clipPath }"><slot name="before" /></motion.div>
    <template v-if="showLabels">
      <motion.span class="be-chip before" aria-hidden="true" :style="{ opacity: beforeOpacity }">{{ labels?.before ?? 'Before' }}</motion.span>
      <motion.span class="be-chip after" aria-hidden="true" :style="{ opacity: afterOpacity }">{{ labels?.after ?? 'After' }}</motion.span>
    </template>
    <svg class="be-divider" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <motion.path :d="line" vector-effect="non-scaling-stroke" stroke="rgb(0 0 0 / .14)" stroke-linecap="square" :initial="false" :animate="{ strokeWidth: dragging && !reduce ? 5.5 : 4 }" :transition="pressSpring" />
      <motion.path :d="line" vector-effect="non-scaling-stroke" stroke="white" stroke-linecap="square" :initial="false" :animate="{ strokeWidth: dragging && !reduce ? 3.5 : 2 }" :transition="pressSpring" />
    </svg>
    <motion.div class="be-handle-track" :style="{ x: dividerX }">
      <div class="be-handle-position">
        <input ref="input" class="be-range" type="range" min="0" max="100" step="any" :value="current" :aria-valuenow="Math.round(current)"
          :aria-label="labels?.label ?? 'Before and after comparison'" :aria-valuetext="(labels?.valueText ?? '{value}% before').replace('{value}', String(Math.round(current)))"
          :disabled="disabled" @keydown="keydown" @input="stopHint(); commit(($event.target as HTMLInputElement).valueAsNumber, true)" />
        <motion.span aria-hidden="true" class="be-knob" :initial="false" :animate="{ scale: reduce ? 1 : dragging ? 1.08 : hovered ? 1.04 : 1 }" :transition="pressSpring"
          @pointerenter="hovered = hoverCapable && !disabled && $event.pointerType !== 'touch'" @pointerleave="hovered = false">
          <motion.span class="be-chevron" aria-hidden="true" :initial="false" :animate="{ x: -split }" :transition="pressSpring"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></motion.span>
          <motion.span class="be-chevron" aria-hidden="true" :initial="false" :animate="{ x: split }" :transition="pressSpring"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg></motion.span>
        </motion.span>
      </div>
    </motion.div>
  </div>
</template>

<style scoped>
.be-comparison { position: relative; isolation: isolate; width: 100%; aspect-ratio: 3 / 2; overflow: hidden; border-radius: 1rem; background: var(--beui-muted); touch-action: pan-y pinch-zoom; user-select: none; cursor: ew-resize; }
.be-comparison[data-disabled=true] { opacity: .6; cursor: default; } .be-comparison[data-dragging=true] { cursor: grabbing; }
.be-layer, .be-divider, .be-handle-track { position: absolute; inset: 0; }
.be-layer { pointer-events: none; } .be-divider { width: 100%; height: 100%; overflow: visible; fill: none; pointer-events: none; }
.be-chip { position: absolute; top: .75rem; padding: .25rem .625rem; border-radius: 999px; pointer-events: none; color: white; background: rgb(0 0 0 / .45); backdrop-filter: blur(4px); font: inherit; font-size: .75rem; line-height: 1rem; font-weight: 500; }
.be-chip.before { left: .75rem; } .be-chip.after { right: .75rem; }
.be-handle-track { pointer-events: none; } .be-handle-position { position: absolute; left: 0; top: 50%; transform: translate(-50%, -50%); }
.be-knob { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: white; color: #171717; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / .12); pointer-events: auto; }
.be-chevron { display: flex; } .be-chevron:first-child { margin-inline-end: -4px; } .be-chevron:last-child { margin-inline-start: -4px; }
.be-knob svg { display: block; width: 14px; height: 14px; stroke: currentColor; stroke-width: 2.5px; stroke-linejoin: round; stroke-linecap: round; fill: none; }
.be-range { position: absolute; inset: 0; opacity: 0; width: 100%; height: 100%; margin: 0; pointer-events: none; }
.be-range:focus-visible + .be-knob { box-shadow: 0 0 0 2px rgb(0 0 0 / .2), 0 0 0 4px var(--beui-ring), 0 0 0 1px rgb(0 0 0 / .12); }
</style>

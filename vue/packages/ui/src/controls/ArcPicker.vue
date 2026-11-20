<script setup lang="ts">
import { computed, nextTick, shallowRef, useId, useTemplateRef, watch } from 'vue'
import type { ChoiceOption } from './types'

const { options, side = 'right', radius = 260, visibleCount = 9, itemHeight = 48, disabled, name, label = 'Select an option' } = defineProps<{
  options: readonly ChoiceOption[]; side?: 'top' | 'bottom' | 'left' | 'right'; radius?: number; visibleCount?: number; itemHeight?: number; disabled?: boolean; name?: string; label?: string
}>()
const model = defineModel<string>()
const list = useTemplateRef('list')
const uid = useId()
const horizontal = computed(() => side === 'top' || side === 'bottom')
const selectedIndex = computed(() => {
  const found = options.findIndex(option => option.value === model.value && !option.disabled)
  return found >= 0 ? found : options.findIndex(option => !option.disabled)
})
const cursor = shallowRef(selectedIndex.value)
const dragging = shallowRef(false)
let gesture: { id: number; origin: number; index: number; last: number; time: number; velocity: number } | undefined
let dragged = false
let wheelAccum = 0
let lastWheel = 0
watch(selectedIndex, value => { if (!dragging.value) cursor.value = value })

function select(index: number, direction = 1, focus = false) {
  if (disabled || !options.length) return
  let target = Math.max(0, Math.min(options.length - 1, Math.round(index)))
  while (options[target]?.disabled) target += direction
  const item = options[target]
  if (!item) return
  model.value = item.value
  if (!dragging.value) cursor.value = target
  if (focus) nextTick(() => document.getElementById(`${uid}-${target}`)?.focus({ preventScroll: true }))
}
function geometry(index: number) {
  const safeRadius = Math.max(1, radius)
  const angle = Math.max(-1.5, Math.min(1.5, (index - cursor.value) * itemHeight / safeRadius))
  const bend = safeRadius * (1 - Math.cos(angle))
  const along = safeRadius * Math.sin(angle)
  const x = horizontal.value ? along : side === 'left' ? bend : -bend
  const y = horizontal.value ? (side === 'top' ? bend : -bend) : along
  const rotation = (side === 'left' || side === 'bottom' ? -angle : angle) * 180 / Math.PI
  const distance = Math.abs(index - cursor.value)
  return {
    transform: `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${rotation}deg)`,
    opacity: Math.max(0, Math.min(1, (visibleCount / 2 + .5 - distance) / 1.5)),
    visibility: distance > visibleCount / 2 + 1 ? 'hidden' as const : 'visible' as const,
  }
}
function keys(event: KeyboardEvent) {
  const index = selectedIndex.value
  const targets: Record<string, number> = { ArrowUp: index - 1, ArrowLeft: index - 1, ArrowDown: index + 1, ArrowRight: index + 1, Home: 0, End: options.length - 1, PageDown: index + 5, PageUp: index - 5 }
  const target = targets[event.key]
  if (target === undefined) return
  event.preventDefault()
  const direction = event.key === 'End' || (target < index && event.key !== 'Home') ? -1 : 1
  select(target, direction, true)
}
function wheel(event: WheelEvent) {
  if (disabled) return
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (performance.now() - lastWheel > 140) wheelAccum = 0
  lastWheel = performance.now()
  wheelAccum += event.deltaMode === 1 ? delta * 16 : delta
  const threshold = Math.max(16, itemHeight * .6)
  const steps = Math.trunc(wheelAccum / threshold)
  if (steps) { wheelAccum -= steps * threshold; select(selectedIndex.value + steps, Math.sign(steps)) }
}
function coordinate(event: PointerEvent) { return horizontal.value ? event.clientX : event.clientY }
function start(event: PointerEvent) {
  if (disabled || event.button !== 0 || gesture) return
  const origin = coordinate(event)
  dragged = false
  gesture = { id: event.pointerId, origin, index: cursor.value, last: origin, time: performance.now(), velocity: 0 }
}
function move(event: PointerEvent) {
  if (!gesture || gesture.id !== event.pointerId) return
  const coordinateNow = coordinate(event)
  if (!dragged && Math.abs(coordinateNow - gesture.origin) < 4) return
  if (!dragged && event.isTrusted) list.value?.setPointerCapture(event.pointerId)
  dragged = dragging.value = true
  const now = performance.now()
  gesture.velocity = (gesture.last - coordinateNow) / Math.max(8, now - gesture.time)
  gesture.last = coordinateNow
  gesture.time = now
  cursor.value = Math.max(0, Math.min(options.length - 1, gesture.index + (gesture.origin - coordinateNow) / Math.max(1, itemHeight)))
  select(cursor.value, coordinateNow < gesture.origin ? 1 : -1)
}
function end(event: PointerEvent) {
  if (!gesture || gesture.id !== event.pointerId) return
  const coast = performance.now() - gesture.time < 100 && event.type === 'pointerup' ? gesture.velocity * 180 / Math.max(1, itemHeight) : 0
  gesture = undefined
  dragging.value = false
  if (dragged) select(cursor.value + coast, coast < 0 ? -1 : 1)
  cursor.value = selectedIndex.value
  if (list.value?.hasPointerCapture(event.pointerId)) list.value.releasePointerCapture(event.pointerId)
}
</script>
<template>
  <div ref="list" role="radiogroup" class="arc" :data-side="side" :data-dragging="dragging" :aria-label="label" :aria-orientation="horizontal ? 'horizontal' : 'vertical'"
    :style="{ height: `${horizontal ? radius * .8 : itemHeight * visibleCount}px`, touchAction: horizontal ? 'pan-y' : 'pan-x' }"
    @wheel.prevent="wheel" @keydown="keys" @pointerdown="start" @pointermove="move" @pointerup="end" @pointercancel="end" @lostpointercapture.self="end">
    <input v-if="name" type="hidden" :name="name" :value="options[selectedIndex]?.value" :disabled="disabled" />
    <button v-for="(option, index) in options" :id="`${uid}-${index}`" :key="option.value" type="button" role="radio" :aria-checked="selectedIndex === index" :tabindex="selectedIndex === index ? 0 : -1" :disabled="disabled || option.disabled" :style="geometry(index)" @click="!dragged && select(index)">{{ option.label }}</button>
  </div>
</template>
<style scoped>
.arc { position: relative; width: 100%; overflow: hidden; user-select: none; cursor: grab; } .arc[data-dragging=true] { cursor: grabbing; }
.arc button { position: absolute; top: 50%; left: 50%; background: transparent; border: 0; padding: .2rem .55rem; white-space: nowrap; font: inherit; font-weight: 300; font-size: clamp(1rem, 3vw, 1.5rem); color: var(--beui-muted-foreground); cursor: inherit; }
.arc[data-side=top] button { top: 20%; } .arc[data-side=bottom] button { top: 80%; }
.arc button[aria-checked=true] { color: var(--beui-primary); } .arc button:disabled { color: var(--beui-border); }
.arc button[aria-checked=true]::before, .arc button[aria-checked=true]::after { content: ''; position: absolute; inset-block: .2rem; width: .3rem; border-block: 2px solid currentColor; }
.arc button[aria-checked=true]::before { left: -.2rem; border-left: 2px solid currentColor; } .arc button[aria-checked=true]::after { right: -.2rem; border-right: 2px solid currentColor; }
@media(prefers-reduced-motion:no-preference){ .arc[data-dragging=false] button { transition: transform .18s cubic-bezier(.16,1,.3,1), opacity .18s; } }
</style>

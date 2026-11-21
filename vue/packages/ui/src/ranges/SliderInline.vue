<script setup lang="ts">
import { animate, motion, useMotionValue, useTransform } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { capturePointer, releasePointer } from '../core/touch'
import { glideSpringConfig, type SliderBaseProps } from './types'
import { snapSliderValue, useSlider } from './use-slider'

const STOP_COUNT = 10
const HANDLE_START = 8
const HANDLE_END_INSET = 12
const TEXT_INSET = 20
// Matches RangeSlider's bouncy grab and release feedback.
const SPRING_BOUNCY = { type: 'spring', stiffness: 500, damping: 14, mass: 0.7 } as const

type Stop = { value: number, x: number }

function mapBetweenStops(stops: Stop[], point: number, from: keyof Stop, to: keyof Stop) {
  const upperIndex = stops.findIndex(stop => stop[from] >= point)
  const upper = stops[upperIndex < 0 ? stops.length - 1 : upperIndex]
  const lower = stops[Math.max(0, upperIndex - 1)]
  if (lower[from] === upper[from]) return upper[to]
  return lower[to] + ((point - lower[from]) / (upper[from] - lower[from])) * (upper[to] - lower[to])
}

function nearestStop(stops: Stop[], x: number) {
  return stops.reduce((nearest, stop) => (Math.abs(stop.x - x) < Math.abs(nearest.x - x) ? stop : nearest))
}

/** An always-visible inline slider with an inset fill and a thumb that parts
 * around its labels, keeping their text readable as the handle passes them. */
const props = withDefaults(defineProps<SliderBaseProps & {
  /** Formats the inline value without changing its precision. */
  format?: (value: number) => string
  /** Show markers for the ten evenly spaced snap stops, except where they overlap inline text. */
  showTicks?: boolean
}>(), { showTicks: true })
const emit = defineEmits<{ 'update:modelValue': [value: number], valueChange: [value: number] }>()
const reduce = useReducedMotion()
const format = (value: number) => (props.format ? props.format(value) : String(value))

const stepSize = computed(() => (props.step && props.step > 0 ? props.step : 1))
const precision = computed(() => stepSize.value.toFixed(6).replace(/0+$/, '').split('.')[1]?.length ?? 0)
const { sliderRef, current, min, max, commit, aria } = useSlider(props, value => {
  emit('update:modelValue', value)
  emit('valueChange', value)
}, {
  step: () => 10 ** -precision.value,
  fallbackLabel: () => props.label,
  formatValueText: format,
})

const track = useTemplateRef<HTMLElement>('track')
const labelEl = useTemplateRef<HTMLElement>('labelEl')
const readoutEl = useTemplateRef<HTMLElement>('readoutEl')
const geometry = shallowRef({ width: 292, labelWidth: 22, readoutWidth: 24 })
const dragging = shallowRef(false)
let measured = false
let dragFrame: number | null = null
let pendingDragValue: number | null = null
let gesture: { id: number, left: number, offset: number, x: number } | null = null

let disconnect = () => {}
onMounted(() => {
  const trackNode = track.value, labelNode = labelEl.value, readoutNode = readoutEl.value
  if (!trackNode || !labelNode || !readoutNode) return
  const measure = () => {
    const width = trackNode.getBoundingClientRect().width
    if (!width) return
    const next = { width, labelWidth: labelNode.getBoundingClientRect().width, readoutWidth: readoutNode.getBoundingClientRect().width }
    const previous = geometry.value
    if (previous.width === next.width && previous.labelWidth === next.labelWidth && previous.readoutWidth === next.readoutWidth) return
    geometry.value = next
  }
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(trackNode)
  observer.observe(labelNode)
  observer.observe(readoutNode)
  disconnect = () => observer.disconnect()
  nextTick(() => { measured = true })
})

// Each stop owns both a value and a physical position. As in RangeSlider, the
// stops span the entire track at even intervals; text only affects whether a
// marker is painted, never whether its stop remains interactive.
const endX = computed(() => Math.max(HANDLE_START, geometry.value.width - HANDLE_END_INSET))
const stops = computed<Stop[]>(() => {
  const values = [...new Set(Array.from({ length: STOP_COUNT }, (_, index) =>
    snapSliderValue(min.value + (index / (STOP_COUNT - 1)) * (max.value - min.value), min.value, max.value, stepSize.value)))]
  return values.map((value, index) => ({
    value,
    x: values.length === 1 ? HANDLE_START : HANDLE_START + (index / (values.length - 1)) * (endX.value - HANDLE_START),
  }))
})
const restingX = computed(() => mapBetweenStops(stops.value, current.value, 'value', 'x'))

// One motion value owns the thumb for the entire gesture. Pointer movement
// writes pixels directly; only release/click/keyboard changes use a spring.
// Never derive dragging pixels from a rounded value or swap to a lagging spring.
const handleX = useMotionValue(restingX.value)
let restingTarget = restingX.value
function settleTo(x: number) {
  restingTarget = x
  handleX.jump(handleX.get())
  if (reduce.value) handleX.jump(x)
  else animate(handleX, x, { type: 'spring', ...glideSpringConfig })
}
watch(restingX, value => {
  if (gesture || restingTarget === value) return
  // The first measurement moves the stops without any value change: land there.
  if (!measured) { restingTarget = value; handleX.jump(value); return }
  settleTo(value)
}, { flush: 'pre' })
onBeforeUnmount(() => {
  disconnect()
  handleX.stop()
  if (dragFrame !== null) cancelAnimationFrame(dragFrame)
})

// Slide a fixed-size fill inside the inset clipping window. The labels and dots
// stay above it, and only transforms animate.
const fillX = useTransform(() => {
  const x = handleX.get()
  const right = x >= endX.value ? geometry.value.width - 2 : x + 8
  return right - geometry.value.width + 2
})
// Part progressively over six pixels at each text edge instead of toggling the
// stem on/off in a single pointer frame. The thumb uses the same two-dot
// treatment across both the label and numeric readout.
const split = useTransform(() => {
  const x = handleX.get()
  const { width, labelWidth, readoutWidth } = geometry.value
  const overlap = (start: number, end: number) => Math.max(0, Math.min(1, (x + 4 - start) / 6, (end - x) / 6))
  return Math.max(overlap(TEXT_INSET, TEXT_INSET + labelWidth), overlap(width - TEXT_INSET - readoutWidth, width - TEXT_INSET))
})
const stemOpacity = useTransform(split, amount => 1 - amount)
const capTop = useTransform(split, amount => -amount)
const capBottom = useTransform(split, amount => amount)
const capTopStyle = computed(() => (reduce.value ? undefined : { y: capTop }))
const capBottomStyle = computed(() => (reduce.value ? undefined : { y: capBottom }))

const overlapsText = (x: number, bounds: { start: number, end: number }) => x + 2 >= bounds.start && x - 2 <= bounds.end
const ticks = computed(() => {
  if (!props.showTicks) return []
  const { width, labelWidth, readoutWidth } = geometry.value
  const labelBounds = { start: TEXT_INSET, end: TEXT_INSET + labelWidth }
  const readoutBounds = { start: width - TEXT_INSET - readoutWidth, end: width - TEXT_INSET }
  return stops.value.map(stop => stop.x).filter(x => !overlapsText(x, labelBounds) && !overlapsText(x, readoutBounds))
})

function queueDragCommit(value: number) {
  pendingDragValue = value
  if (dragFrame !== null) return
  dragFrame = requestAnimationFrame(() => {
    dragFrame = null
    if (pendingDragValue !== null) commit(pendingDragValue)
    pendingDragValue = null
  })
}
function cancelDragCommit() {
  if (dragFrame !== null) cancelAnimationFrame(dragFrame)
  dragFrame = null
  pendingDragValue = null
}

function pointerDown(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  if (props.disabled || event.button !== 0 || gesture) return
  const rect = target.getBoundingClientRect()
  if (!rect.width) return
  event.preventDefault()
  const pointerX = event.clientX - rect.left
  const thumbX = handleX.get()
  // Grabbing the thumb preserves the exact grab point. A track click waits for
  // release, so it glides to a dot without an intermediate jump.
  const offset = Math.abs(pointerX - thumbX - 2) <= 12 ? pointerX - thumbX : 2
  gesture = { id: event.pointerId, left: rect.left, offset, x: thumbX }
  dragging.value = true
  handleX.stop()
  cancelDragCommit()
  capturePointer(target, event.pointerId)
  ;(target.querySelector('[role=slider]') as HTMLElement | null)?.focus({ preventScroll: true })
}
function pointerMove(event: PointerEvent) {
  const active = gesture
  if (!active || active.id !== event.pointerId || props.disabled) return
  const x = Math.min(endX.value, Math.max(HANDLE_START, event.clientX - active.left - active.offset))
  active.x = x
  handleX.set(x)
  // Use the same piecewise map as the resting stops, so value and position
  // agree throughout the drag.
  queueDragCommit(mapBetweenStops(stops.value, x, 'x', 'value'))
}
function endGesture(event: PointerEvent) {
  const active = gesture
  if (!active || active.id !== event.pointerId) return
  // Clear before releasing capture: its lost-capture event must not commit twice.
  gesture = null
  cancelDragCommit()
  dragging.value = false
  if (!props.disabled && geometry.value.width > 0) {
    const x = event.type === 'pointerup' ? event.clientX - active.left - active.offset : active.x
    const stop = nearestStop(stops.value, x)
    commit(stop.value)
    settleTo(props.modelValue === undefined ? stop.x : restingX.value)
  } else {
    settleTo(restingX.value)
  }
  releasePointer(event.currentTarget as Element, event.pointerId)
}

function keyDown(event: KeyboardEvent) {
  if (props.disabled) return
  const now = current.value
  const list = stops.value
  const next: Record<string, number> = {
    ArrowRight: list.find(stop => stop.value > now)?.value ?? max.value,
    ArrowUp: list.find(stop => stop.value > now)?.value ?? max.value,
    ArrowLeft: [...list].reverse().find(stop => stop.value < now)?.value ?? min.value,
    ArrowDown: [...list].reverse().find(stop => stop.value < now)?.value ?? min.value,
    Home: min.value,
    End: max.value,
    PageUp: max.value,
    PageDown: min.value,
  }
  if (event.key in next) {
    event.preventDefault()
    commit(next[event.key])
  }
}
</script>

<template>
  <div
    ref="track"
    class="be-inline"
    :class="{ 'be-inline-disabled': disabled }"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="endGesture"
    @pointercancel="endGesture"
    @lostpointercapture="endGesture"
  >
    <div class="be-inline-fill" aria-hidden="true">
      <motion.div class="be-inline-fill-bar" :style="{ x: fillX }" />
    </div>
    <div class="be-inline-text" aria-hidden="true">
      <span ref="labelEl" class="be-inline-label">{{ label }}</span>
      <span ref="readoutEl" class="be-inline-readout">{{ format(current) }}</span>
      <span v-for="left in ticks" :key="left" class="be-inline-tick" :style="{ left: `${left}px` }" />
    </div>
    <motion.div
      class="be-inline-handle"
      aria-hidden="true"
      :initial="false"
      :animate="reduce ? undefined : { scaleY: dragging ? 1.35 : 1 }"
      :transition="SPRING_BOUNCY"
      :style="{ x: handleX }"
    >
      <motion.span class="be-inline-cap be-inline-cap-top" :style="capTopStyle" />
      <motion.span class="be-inline-stem" :style="{ opacity: stemOpacity }" />
      <motion.span class="be-inline-cap be-inline-cap-bottom" :style="capBottomStyle" />
    </motion.div>
    <button ref="sliderRef" type="button" v-bind="aria" class="be-inline-button" @keydown="keyDown" />
  </div>
</template>

<style scoped>
.be-inline {
  position: relative; box-sizing: border-box; width: 100%; height: 2.5rem; overflow: hidden; border-radius: .5rem; background: var(--beui-muted);
  color: var(--beui-foreground); touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: grab;
}
.be-inline:active { cursor: grabbing; }
.be-inline-disabled { pointer-events: none; opacity: .5; }
.be-inline-fill { position: absolute; inset: 0 2px; overflow: hidden; border-radius: .5rem; pointer-events: none; }
.be-inline-fill-bar { position: absolute; inset: 0; border-radius: .5rem; background: color-mix(in srgb, var(--beui-foreground) 15%, transparent); }
.be-inline-text { position: absolute; inset: 0; pointer-events: none; color: var(--beui-foreground); }
.be-inline-label { position: absolute; left: 1.25rem; top: 50%; max-width: 40%; transform: translateY(-50%); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
.be-inline-readout { position: absolute; right: 1.25rem; top: 50%; max-width: 40%; transform: translateY(-50%); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 18px; font-weight: 600; letter-spacing: -.025em; font-variant-numeric: tabular-nums; }
.be-inline-tick { position: absolute; top: 50%; width: .25rem; height: .25rem; transform: translateY(-50%); border-radius: 999px; background: color-mix(in srgb, var(--beui-foreground) 25%, transparent); }
.be-inline-handle { position: absolute; left: 0; top: .5rem; width: .25rem; height: 1.5rem; pointer-events: none; color: var(--beui-foreground); }
.be-inline-cap { position: absolute; width: .25rem; height: .25rem; border-radius: 999px; background: currentColor; }
.be-inline-cap-top { top: 0; }
.be-inline-cap-bottom { bottom: 0; }
.be-inline-stem { position: absolute; top: 0; bottom: 0; width: .25rem; border-radius: 999px; background: currentColor; }
.be-inline-button { position: absolute; inset: 0; box-sizing: border-box; width: 100%; margin: 0; padding: 0; border: 0; border-radius: .5rem; background: none; outline: none; cursor: inherit; touch-action: none; }
</style>

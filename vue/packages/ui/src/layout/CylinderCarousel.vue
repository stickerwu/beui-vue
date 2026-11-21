<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const cylinderCarouselMessages = {
  roleDescription: 'carousel',
}
export type CylinderCarouselMessages = typeof cylinderCarouselMessages
</script>

<script setup lang="ts" generic="Item extends { id: string; label?: string }">
import { useElementSize } from '@vueuse/core'
import { animate, useMotionValue } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { capturePointer, releasePointer } from '../core/touch'

const props = withDefaults(defineProps<{
  items: readonly Item[]
  /** Max item box size in px (square) at full size. Balls shrink below this in narrow containers. */
  itemSize?: number
  /** How many item slots span the container width. */
  visibleItems?: number
  /** "concave": inside of the cylinder; "convex": outside of it. */
  variant?: 'concave' | 'convex'
  /** Scale of the smallest ball. */
  minScale?: number
  /** Items rolled per item-width dragged. */
  dragSpeed?: number
  /** Curve depth in px. Defaults to 35% of the item size. */
  arc?: number
  /** Snap to the nearest item when the roll settles. */
  snap?: boolean
  /** Roll on its own until interacted with. */
  autoRotate?: boolean
  /** Auto-roll speed in items per second. */
  autoRotateSpeed?: number
  /** Stage height in px. Defaults to the fitted item size. */
  height?: number
  defaultIndex?: number
  label?: string
  labels?: Partial<CylinderCarouselMessages>
}>(), { itemSize: 200, visibleItems: 5, variant: 'concave', minScale: 0.55, dragSpeed: 1.5, snap: true, autoRotate: false, autoRotateSpeed: 0.4, defaultIndex: 0 })
const emit = defineEmits<{ indexChange: [index: number] }>()
defineSlots<{ default?: (props: { item: Item; index: number; active: boolean }) => unknown }>()

const t = computed(() => ({ ...cylinderCarouselMessages, ...props.labels }))
const stage = useTemplateRef<HTMLDivElement>('stage')
const { width } = useElementSize(stage)
const reduce = useReducedMotion()

// Carousel-specific: a soft spring that receives the release velocity, so a
// flick keeps rolling freely, drifts past the snap point and eases back.
const GLIDE_SPRING = { stiffness: 40, damping: 20, mass: 3 }
// How far a flick keeps rolling: projected items = release velocity * momentum.
const FLICK_MOMENTUM = 0.45
const MAX_FLICK_ITEMS = 6
// The frame edge sits at this wall angle; how far the wall curves in frame.
const THETA_EDGE = (72 * Math.PI) / 180
// Wall angle past which a ball is parked far off-stage (always hidden there).
const THETA_CLAMP = (95 * Math.PI) / 180

// `scroll` is in item units (continuous); item i sits at x = (i - scroll) * gap.
// Drags write it 1:1 so the wall sticks to the pointer; releases hand the
// pointer velocity to a soft spring so the roll glides on and settles free.
const scroll = useMotionValue(props.defaultIndex)
const position = shallowRef(props.defaultIndex)
const count = computed(() => props.items.length)
const current = computed(() => (count.value ? ((Math.round(position.value) % count.value) + count.value) % count.value : 0))
watch(current, index => emit('indexChange', index))
const stopScroll = scroll.on('change', value => { position.value = value })
onBeforeUnmount(stopScroll)

const geometry = computed(() => {
  const span = width.value || 800
  const slots = Math.max(1, Math.round(props.visibleItems))
  const edgeOffset = (slots + 1) / 2
  const minimum = Math.max(0.01, Math.min(0.999, props.minScale))
  const convex = props.variant === 'convex'
  // Linear in wall angle, not in depth: every step is visibly bigger than the
  // last, growing outward (concave) or inward (convex).
  const scale = (offset: number) => {
    const t = Math.min(Math.abs(offset) / edgeOffset, THETA_CLAMP / THETA_EDGE)
    return convex ? 1 - (1 - minimum) * t : minimum + (1 - minimum) * t
  }
  let sum = 0
  for (let index = 0; index < slots; index++) sum += scale(index - (slots - 1) / 2)
  const size = Math.min(props.itemSize, (span * 0.65) / sum)
  const k = Math.max(0.2, (minimum - Math.cos(THETA_EDGE)) / (1 - minimum))
  const projection = (span / 2 * (Math.cos(THETA_EDGE) + k)) / Math.sin(THETA_EDGE)
  return { span, edgeOffset, scale, convex, size, k, projection, alpha: THETA_EDGE / edgeOffset, gap: span / (slots + 1), arc: props.arc ?? size * 0.35 }
})

function ballStyle(index: number) {
  const g = geometry.value
  // Nearest wrapped offset so items loop around continuously.
  let offset = index - position.value
  offset -= Math.round(offset / count.value) * count.value
  const theta = Math.max(-THETA_CLAMP, Math.min(THETA_CLAMP, offset * g.alpha))
  // Concave spacing follows the interior perspective; convex pairs its big
  // center balls with uniform spacing.
  const x = g.convex ? offset * g.gap : (g.projection * Math.sin(theta)) / (Math.cos(theta) + g.k)
  // Parabola centered on the stage, deliberately unclamped so entries never pop.
  const ratio = x / (g.span / 2)
  const valley = g.arc * (0.5 - ratio * ratio)
  const y = g.convex ? -valley : valley
  return {
    width: `${g.size}px`,
    height: `${g.size}px`,
    marginLeft: `${-g.size / 2}px`,
    marginTop: `${-g.size / 2}px`,
    // Fully off-stage balls stop painting (matters for canvas/shader children).
    visibility: Math.abs(x) > g.span / 2 + g.size ? 'hidden' as const : 'visible' as const,
    transform: `translate(${x}px, ${y}px) scale(${g.scale(offset)})`,
  }
}

let glide: ReturnType<typeof animate> | undefined
let wheelTimer: ReturnType<typeof setTimeout> | undefined
let dragging: boolean = false
let hovering = false
function setHover(value: boolean) { hovering = value }
function stopGlide() {
  glide?.stop()
  glide = undefined
}
// Spring toward `to`, carrying `velocity` (items/s) through so motion never steps.
function glideTo(to: number, velocity: number) {
  stopGlide()
  if (reduce.value) { scroll.set(to); return }
  const controls = animate(scroll, to, { type: 'spring', ...GLIDE_SPRING, velocity, restDelta: 0.001, restSpeed: 0.005 })
  glide = controls
  controls.then(() => { if (glide === controls) glide = undefined })
}
function settle(velocity: number) {
  const projected = scroll.get() + Math.max(-MAX_FLICK_ITEMS, Math.min(MAX_FLICK_ITEMS, velocity * FLICK_MOMENTUM))
  glideTo(props.snap ? Math.round(projected) : projected, velocity)
}

const drag = { startX: 0, startScroll: 0, lastX: 0, lastT: 0, prevX: 0, prevT: 0 }
function pointerDown(event: PointerEvent) {
  event.preventDefault()
  stopGlide()
  dragging = true
  capturePointer(event.currentTarget as Element, event.pointerId)
  const now = performance.now()
  Object.assign(drag, { startX: event.clientX, startScroll: scroll.get(), lastX: event.clientX, lastT: now, prevX: event.clientX, prevT: now })
}
function pointerMove(event: PointerEvent) {
  if (!dragging) return
  scroll.set(drag.startScroll - ((event.clientX - drag.startX) * props.dragSpeed) / geometry.value.gap)
  drag.prevX = drag.lastX
  drag.prevT = drag.lastT
  drag.lastX = event.clientX
  drag.lastT = performance.now()
}
function pointerUp(event: PointerEvent) {
  if (!dragging) return
  dragging = false
  releasePointer(event.currentTarget as Element, event.pointerId)
  const dt = drag.lastT - drag.prevT
  const pxPerMs = dt > 0 ? (drag.lastX - drag.prevX) / dt : 0
  settle((-pxPerMs * props.dragSpeed * 1000) / geometry.value.gap)
}
function rollBy(direction: number) {
  glideTo(Math.round(scroll.get()) + direction, scroll.getVelocity())
}
function wheel(event: WheelEvent) {
  stopGlide()
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  scroll.set(scroll.get() + delta / geometry.value.gap)
  clearTimeout(wheelTimer)
  wheelTimer = setTimeout(() => settle(scroll.getVelocity()), 140)
}

let raf = 0
let last = 0
function tick(now: number) {
  const dt = (now - last) / 1000
  last = now
  if (!dragging && !hovering && !glide) scroll.set(scroll.get() + props.autoRotateSpeed * dt)
  raf = requestAnimationFrame(tick)
}
function syncAutoRotate() {
  cancelAnimationFrame(raf)
  if (!props.autoRotate || reduce.value || count.value === 0) return
  last = performance.now()
  raf = requestAnimationFrame(tick)
}
onMounted(() => watch([() => props.autoRotate, reduce, count], syncAutoRotate, { immediate: true }))
onBeforeUnmount(() => { cancelAnimationFrame(raf); clearTimeout(wheelTimer); stopGlide() })

const stageHeight = computed(() => props.height ?? geometry.value.size)
</script>

<template>
  <div
    ref="stage" role="application" tabindex="0" class="be-cylinder"
    :aria-roledescription="t.roleDescription" :aria-label="label"
    :style="{ height: `${stageHeight}px` }"
    @keydown.right.prevent="rollBy(1)" @keydown.left.prevent="rollBy(-1)"
    @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerUp"
    @wheel="wheel" @pointerenter="setHover(true)" @pointerleave="setHover(false)">
    <div v-for="(item, index) in items" :key="item.id" class="be-cylinder-ball" :style="ballStyle(index)">
      <slot :item="item" :index="index" :active="current === index">{{ item.label }}</slot>
    </div>
  </div>
</template>

<style scoped>
/* clip-path, not overflow: it also clips the GPU-composited balls */
.be-cylinder { position: relative; width: 100%; outline: none; clip-path: inset(0); touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: grab; }
.be-cylinder:active { cursor: grabbing; }
.be-cylinder:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.be-cylinder-ball { position: absolute; top: 50%; left: 50%; will-change: transform; }
</style>

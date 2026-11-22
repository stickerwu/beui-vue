<script lang="ts">
export type WheelPickerOption = string | { label: string; value: string }

/** English defaults for `WheelPicker`. */
export const wheelPickerMessages = {
  label: 'Options',
}
export type WheelPickerMessages = typeof wheelPickerMessages
</script>

<script setup lang="ts">
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useAttrs, useId, useTemplateRef, watch } from 'vue'
import { TOUCH_GESTURE_STYLE, capturePointer, releasePointer } from '../core/touch'
import { createTickPlayer } from '../core/tick-sound'

const props = withDefaults(defineProps<{
  options: readonly WheelPickerOption[]
  defaultValue?: string
  /** Rows visible through the window, odd. More = flatter curve. */
  visibleCount?: number
  /** Row height in px. */
  itemHeight?: number
  disabled?: boolean
  /** Play a short tick each time the selected value changes. */
  sound?: boolean
  labels?: Partial<WheelPickerMessages>
}>(), { visibleCount: 5, itemHeight: 36, disabled: false, sound: false })
// `aria-label` (and the earlier `label` / `class-name` names) arrive as attributes: the
// root element is the listbox itself, so they are applied by hand rather than inherited.
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
const model = defineModel<string>()
const emit = defineEmits<{ valueChange: [value: string] }>()
const reduceMotion = useReducedMotion()
// Reactive: the preference is only known once the app has hydrated, and it can change at any time.
const reduce = computed(() => reduceMotion.value)

const DEG = Math.PI / 180
// Physics constants, tuned for an iOS-like flick rather than reused from the
// shared spring tokens: the wheel coasts in whole-row units and springs to an
// integer detent, which a layout spring cannot express cleanly.
const DECELERATION = 0.00042 // rows per ms², how fast a flick bleeds off
const MAX_VELOCITY = 0.18 // rows per ms, caps a hard fling
const VELOCITY_WINDOW = 90 // ms of recent drag to average a release velocity over
const WHEEL_SENS = 0.012 // rows per pixel of wheel delta
const WHEEL_SETTLE = 110 // ms of wheel idle before snapping to a row
const easeOutCubic = (p: number) => 1 - (1 - p) ** 3
// Overshoots the target by a few percent then settles — the little spring
// bounce as a row snaps home. `BACK` sets how far it drifts past.
const BACK = 1.35
const easeOutBack = (p: number) => 1 + (BACK + 1) * (p - 1) ** 3 + BACK * (p - 1) ** 2
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))

const valueOf = (option: WheelPickerOption) => (typeof option === 'string' ? option : option.value)
const labelOf = (option: WheelPickerOption) => (typeof option === 'string' ? option : option.label)

const last = computed(() => props.options.length - 1)
const indexOf = (value: string | undefined) => {
  const index = props.options.findIndex(option => valueOf(option) === value)
  return index < 0 ? 0 : index
}
const currentValue = computed(() => model.value ?? props.defaultValue ?? (props.options[0] ? valueOf(props.options[0]) : undefined))
// The drum is decorative, so the listbox exposes only the selected option to assistive technology.
const selectedId = useId()
const selectedLabel = computed(() => { const option = props.options.find(item => valueOf(item) === currentValue.value); return option === undefined ? '' : labelOf(option) })

// Cylinder geometry. Each row spans `itemAngle`; `radius` seats the rows on the
// drum; rows past `hideBeyond` sit behind the horizon and are dropped.
const geometry = computed(() => {
  const rowsEachSide = Math.max(1, Math.floor(props.visibleCount / 2))
  const cutoff = rowsEachSide + 1
  const angle = 90 / cutoff
  const radius = props.itemHeight / Math.tan(angle * DEG)
  return {
    itemAngle: angle,
    radius,
    hideBeyond: cutoff,
    height: Math.round(2 * radius * Math.sin(rowsEachSide * angle * DEG) + props.itemHeight),
  }
})

const container = useTemplateRef<HTMLElement>('container')
const drum = useTemplateRef<HTMLElement>('drum')
const band = useTemplateRef<HTMLElement>('band')
// Scroll position measured in rows (a float index). One source of truth for
// both layers: the drum rotates by `itemAngle·scroll`, the crisp band slides by
// `itemHeight·scroll`.
let scroll = indexOf(currentValue.value)
let raf = 0
let dragFrame = 0
let latestY = 0
let emitted = currentValue.value
let lastTick = indexOf(currentValue.value)
let wheelSnap: ReturnType<typeof setTimeout> | null = null
const grabbing = shallowRef(false)
let player: ReturnType<typeof createTickPlayer> | null = null
const getPlayer = () => (player ??= createTickPlayer())

function paint(position: number) {
  const { radius, itemAngle, hideBeyond } = geometry.value
  for (const layer of [drum.value, band.value]) {
    if (!layer) continue
    layer.style.transform = `translateZ(${-radius}px) rotateX(${itemAngle * position}deg)`
    for (const node of Array.from(layer.children) as HTMLElement[]) {
      const index = Number(node.dataset.index)
      // Write only on change — an unconditional write every frame thrashes
      // style recalc and is what makes a drag feel draggy on mobile.
      const want = Math.abs(index - position) > hideBeyond ? 'hidden' : 'visible'
      if (node.style.visibility !== want) node.style.visibility = want
    }
  }
}

function emitValue(index: number) {
  const value = valueOf(props.options[clamp(index, 0, last.value)])
  if (value === undefined || value === emitted) return
  emitted = value
  // Reduced motion has no drum/glide path to tick from — it is a click straight
  // into the emit, so the tick lives here instead.
  if (props.sound && reduce.value) getPlayer().play()
  model.value = value
  emit('valueChange', value)
}

// Drum path: fires a tick whenever the nearest row changes, independent of
// `emitValue` (which only fires on settle during a glide/fling, not per row
// crossed). Gated on `!reduce` since the reduced render never calls this.
function maybeTick(position: number) {
  const row = clamp(Math.round(position), 0, last.value)
  if (!props.sound || reduce.value) {
    lastTick = row
    return
  }
  if (row === lastTick) return
  lastTick = row
  getPlayer().play()
}

function stop() {
  cancelAnimationFrame(raf)
}

// Ease `scroll` from where it is to an integer detent over `duration`. The
// easing may overshoot (spring bounce) before it resolves exactly on `to`.
function glide(to: number, duration: number, ease: (p: number) => number = easeOutCubic) {
  stop()
  const from = scroll
  const distance = to - from
  if (!distance || duration <= 0) {
    scroll = to
    paint(to)
    maybeTick(to)
    emitValue(to)
    return
  }
  const start = performance.now()
  const tick = (now: number) => {
    const progress = (now - start) / duration
    if (progress >= 1) {
      scroll = to
      paint(to)
      maybeTick(to)
      emitValue(to)
      return
    }
    scroll = from + distance * ease(progress)
    paint(scroll)
    maybeTick(scroll)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}

// Project where a flick of `velocity` (rows/ms) coasts to, then snap to a row.
function fling(velocity: number) {
  const from = scroll
  if (from < 0 || from > last.value) {
    glide(clamp(Math.round(from), 0, last.value), 260) // rubber-band back
    return
  }
  const direction = Math.sign(velocity)
  const coast = ((velocity * velocity) / (2 * DECELERATION)) * direction
  const to = clamp(Math.round(from + coast), 0, last.value)
  // Long, spring-tipped settle so a hard flick reads as free momentum coasting
  // to rest with a gentle bounce, never a clipped stop.
  const duration = clamp(Math.sqrt(Math.abs(to - from)) * 300 + 240, 280, 1700)
  glide(to, duration, easeOutBack)
}

function step(by: number) {
  glide(clamp(Math.round(scroll) + by, 0, last.value), 300, easeOutBack)
}

// Drag: track recent points for a release velocity; rubber-band past the ends.
let drag: { y: number; scroll: number; points: [number, number][] } | null = null

function beginDrag(y: number) {
  stop()
  if (props.sound) getPlayer().prepare()
  grabbing.value = true
  drag = { y, scroll, points: [[y, performance.now()]] }
}

function moveDrag(y: number) {
  const current = drag
  if (!current) return
  // Record every sample for an accurate release velocity, but render the newest
  // position only once per frame.
  latestY = y
  current.points.push([y, performance.now()])
  if (current.points.length > 8) current.points.shift()
  if (dragFrame) return
  dragFrame = requestAnimationFrame(() => {
    dragFrame = 0
    const active = drag
    if (!active) return
    let next = active.scroll + (active.y - latestY) / props.itemHeight
    if (next < 0) next *= 0.3
    else if (next > last.value) next = last.value + (next - last.value) * 0.3
    scroll = next
    paint(next)
    maybeTick(next)
    emitValue(Math.round(clamp(next, 0, last.value)))
  })
}

function endDrag() {
  const current = drag
  if (!current) return
  if (dragFrame) {
    cancelAnimationFrame(dragFrame)
    dragFrame = 0
  }
  drag = null
  grabbing.value = false
  // Average velocity over the last `VELOCITY_WINDOW` ms of movement rather than
  // the final two samples — a single noisy frame otherwise makes an even flick
  // feel like it caught or slipped.
  const points = current.points
  let velocity = 0
  if (points.length > 1) {
    const latest = points[points.length - 1]
    let reference = points[0]
    for (const point of points) {
      if (latest[1] - point[1] <= VELOCITY_WINDOW) {
        reference = point
        break
      }
    }
    const dt = latest[1] - reference[1]
    if (dt > 0) velocity = clamp((reference[0] - latest[0]) / props.itemHeight / dt, -MAX_VELOCITY, MAX_VELOCITY)
  }
  fling(velocity)
}

// Mouse / pen only — touch runs through the native listeners below.
function pointerDown(event: PointerEvent) {
  if (props.disabled || reduce.value || event.pointerType === 'touch') return
  beginDrag(event.clientY)
  capturePointer(event.currentTarget as Element, event.pointerId)
}
function pointerMove(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  moveDrag(event.clientY)
}
function pointerUp(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  // Also the pointercancel handler, where the capture is already gone — an
  // unguarded release throws there and the drum never settles.
  releasePointer(event.currentTarget as Element, event.pointerId)
  endDrag()
}

// Wheel drives `scroll` continuously — like a drag — then snaps once it goes
// idle. Firing a fresh eased step per notch instead stacks overlapping
// animations that keep interrupting each other, which reads as lag.
function wheel(event: WheelEvent) {
  // Native (non-passive) so preventDefault actually stops the page scrolling
  // behind the wheel.
  if (props.disabled || reduce.value) return
  event.preventDefault()
  if (props.sound) getPlayer().prepare()
  stop()
  const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
  const next = clamp(scroll + pixels * WHEEL_SENS, 0, last.value)
  scroll = next
  paint(next)
  maybeTick(next)
  emitValue(Math.round(next))
  if (wheelSnap) clearTimeout(wheelSnap)
  wheelSnap = setTimeout(() => {
    glide(clamp(Math.round(scroll), 0, last.value), 240, easeOutBack)
  }, WHEEL_SETTLE)
}

function keyDown(event: KeyboardEvent) {
  if (props.disabled) return
  const at = Math.round(scroll)
  const map: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, Home: -at, End: last.value - at }
  if (!(event.key in map)) return
  event.preventDefault()
  if (props.sound) getPlayer().prepare()
  step(map[event.key])
}

// Paint the starting frame, and follow controlled/value changes from outside
// unless a gesture is mid-flight.
watch(
  [currentValue, () => props.options],
  ([value]) => {
    if (drag) return
    const target = indexOf(value)
    emitted = value ?? emitted
    if (Math.abs(Math.round(scroll) - target) < 0.001) {
      paint(scroll)
      return
    }
    glide(target, 260)
  },
  { flush: 'post' },
)

watch(geometry, () => nextTick(() => paint(scroll)))

onMounted(() => paint(scroll))
// Touch and wheel listeners are native and non-passive, so the page cannot scroll under the
// gesture. They follow the container, which exists only while motion is allowed.
watch([container, reduce, () => props.disabled], ([element, reduced, disabled], _, onCleanup) => {
  if (!element || reduced || disabled) return
  const start = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (touch) beginDrag(touch.clientY)
  }
  const move = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch || !drag) return
    event.preventDefault()
    moveDrag(touch.clientY)
  }
  element.addEventListener('touchstart', start, { passive: true })
  element.addEventListener('touchmove', move, { passive: false })
  element.addEventListener('touchend', endDrag)
  element.addEventListener('touchcancel', endDrag)
  element.addEventListener('wheel', wheel, { passive: false })
  onCleanup(() => {
    element.removeEventListener('touchstart', start)
    element.removeEventListener('touchmove', move)
    element.removeEventListener('touchend', endDrag)
    element.removeEventListener('touchcancel', endDrag)
    element.removeEventListener('wheel', wheel)
  })
}, { flush: 'post' })

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  cancelAnimationFrame(dragFrame)
  if (wheelSnap) clearTimeout(wheelSnap)
  player?.dispose()
})

const maskImage = 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)'
const listLabel = computed(() => (attrs['aria-label'] as string | undefined) ?? (attrs.label as string | undefined) ?? props.labels?.label ?? wheelPickerMessages.label)
const extraClass = computed(() => (attrs['class-name'] ?? attrs.className) as string | undefined)
const padding = computed(() => (geometry.value.height - props.itemHeight) / 2)
</script>

<template>
  <!-- Reduced motion: a plain snapping scroller. No drum, no physics. -->
  <div
    v-if="reduce"
    class="be-wheel be-wheel-flat"
    :class="[attrs.class, extraClass, disabled && 'be-wheel-disabled']"
    :style="{ height: `${geometry.height}px` }"
  >
    <div class="be-wheel-band" aria-hidden="true" :style="{ height: `${itemHeight}px` }" />
    <ul
      class="be-wheel-flat-list"
      :style="{ paddingTop: `${padding}px`, paddingBottom: `${padding}px`, maskImage, WebkitMaskImage: maskImage }"
      :aria-label="listLabel"
    >
      <li v-for="option in options" :key="valueOf(option)" class="be-wheel-flat-item">
        <button
          type="button"
          :disabled="disabled"
          class="be-wheel-flat-button"
          :aria-current="valueOf(option) === currentValue ? 'true' : undefined"
          :data-current="valueOf(option) === currentValue"
          :style="{ height: `${itemHeight}px` }"
          @click="emitValue(options.indexOf(option))"
        >{{ labelOf(option) }}</button>
      </li>
    </ul>
  </div>

  <div
    v-else
    ref="container"
    class="be-wheel"
    :class="[attrs.class, extraClass, grabbing && 'be-wheel-grabbing']"
    role="listbox"
    :aria-label="listLabel"
    :aria-activedescendant="selectedLabel ? selectedId : undefined"
    :tabindex="disabled ? -1 : 0"
    :style="{ height: `${geometry.height}px`, perspective: '1000px', maskImage, WebkitMaskImage: maskImage, ...TOUCH_GESTURE_STYLE }"
    @keydown="keyDown"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="pointerUp"
    @pointercancel="pointerUp"
  >
    <!-- Curved drum of dimmed rows. -->
    <ul ref="drum" class="be-wheel-drum" aria-hidden="true">
      <li
        v-for="(option, index) in options"
        :key="valueOf(option)"
        :data-index="index"
        class="be-wheel-row"
        :style="{ top: `${-itemHeight / 2}px`, height: `${itemHeight}px`, transform: `rotateX(${-geometry.itemAngle * index}deg) translateZ(${geometry.radius}px)` }"
      >{{ labelOf(option) }}</li>
    </ul>
    <!-- Center band: the very same drum, clipped to one row and drawn crisp.
         Its own perspective, centred on the container middle, matches the main
         drum's projection so the two copies register exactly. -->
    <div class="be-wheel-crisp" aria-hidden="true" :style="{ height: `${itemHeight}px`, perspective: '1000px' }">
      <ul ref="band" class="be-wheel-drum">
        <li
          v-for="(option, index) in options"
          :key="valueOf(option)"
          :data-index="index"
          class="be-wheel-row be-wheel-row-crisp"
          :style="{ top: `${-itemHeight / 2}px`, height: `${itemHeight}px`, transform: `rotateX(${-geometry.itemAngle * index}deg) translateZ(${geometry.radius}px)` }"
        >{{ labelOf(option) }}</li>
      </ul>
    </div>
    <span v-if="selectedLabel" :id="selectedId" role="option" aria-selected="true" class="be-wheel-selected">{{ selectedLabel }}</span>
  </div>
</template>

<style scoped>
.be-wheel {
  position: relative; overflow: hidden; border-radius: 1rem; border: 1px solid var(--beui-border);
  background: var(--beui-card); color: var(--beui-foreground); outline: none; touch-action: none;
  cursor: grab; box-sizing: border-box;
}
.be-wheel-grabbing { cursor: grabbing; }
.be-wheel-selected { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.be-wheel-disabled { pointer-events: none; opacity: .5; }
.be-wheel:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.be-wheel-drum {
  position: absolute; inset-inline: 0; top: 50%; margin: 0; height: 0; padding: 0; list-style: none;
  backface-visibility: hidden; transform-style: preserve-3d; will-change: transform;
}
.be-wheel-row {
  position: absolute; inset-inline: 0; display: flex; align-items: center; justify-content: center;
  font-weight: 500; color: var(--beui-muted-foreground);
}
.be-wheel-row-crisp { color: var(--beui-foreground); }
.be-wheel-crisp {
  pointer-events: none; position: absolute; inset-inline: 0; top: 50%; z-index: 10;
  transform: translateY(-50%); overflow: hidden; border-radius: .375rem;
  background: color-mix(in srgb, var(--beui-foreground) 4%, transparent);
}
.be-wheel-flat { overflow: hidden; }
.be-wheel-band {
  pointer-events: none; position: absolute; inset-inline: 0; top: 50%; z-index: 10;
  transform: translateY(-50%); border-block: 1px solid var(--beui-border);
  background: color-mix(in srgb, var(--beui-foreground) 4%, transparent);
}
.be-wheel-flat-list {
  height: 100%; margin: 0; padding-inline: 0; overflow-y: auto; list-style: none;
  scroll-snap-type: y mandatory; scrollbar-width: none; -ms-overflow-style: none; box-sizing: border-box;
}
.be-wheel-flat-list::-webkit-scrollbar { display: none; }
.be-wheel-flat-item { scroll-snap-align: center; }
.be-wheel-flat-button {
  display: flex; width: 100%; align-items: center; justify-content: center; border: 0; background: none;
  font: inherit; font-weight: 500; color: var(--beui-muted-foreground); cursor: pointer;
}
.be-wheel-flat-button[data-current="true"] { color: var(--beui-foreground); }
@media (prefers-reduced-motion: reduce) { .be-wheel-flat-list { scroll-behavior: auto; } }
</style>

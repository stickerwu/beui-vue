<script lang="ts">
import type { ChoiceOption } from './types'

export type ArcPickerOption = ChoiceOption
export type ArcPickerSide = 'top' | 'bottom' | 'left' | 'right'

/** English defaults. Override per instance with `labels`. */
export const arcPickerMessages = {
  label: 'Choose an option',
  instructionsHorizontal: 'Drag horizontally or scroll to choose. Use arrow keys to move, Home and End to jump.',
  instructionsVertical: 'Drag vertically or scroll to choose. Use arrow keys to move, Home and End to jump.',
  empty: 'No options',
}
export type ArcPickerMessages = typeof arcPickerMessages
</script>

<script setup lang="ts">
import { animate, motion, useMotionValue, useMotionValueEvent, useSpring, useTransform } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { glideSpring, layoutSpring } from '../core/motion'
import { useMotionSource } from '../core/motion-source'
import { capturePointer, releasePointer } from '../core/touch'
import ArcPickerOptionItem from './ArcPickerOption.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  options: readonly ChoiceOption[]
  /** Bound value. Use `v-model` to control the picker. */
  modelValue?: string
  /** Initial choice when the picker is not controlled through `v-model`. */
  defaultValue?: string
  /** The side the arc bows toward. Top and bottom scroll horizontally. */
  side?: ArcPickerSide
  /** Radius in pixels. Larger radii make a gentler curve. */
  radius?: number
  /** Minimum spacing along the arc. Horizontal sides also make room for label widths. */
  itemHeight?: number
  visibleCount?: number
  disabled?: boolean
  name?: string
  /** Accessible name of the radiogroup. */
  label?: string
  /** Override any built-in string. */
  labels?: Partial<ArcPickerMessages>
}>(), {
  side: 'right' as ArcPickerSide,
  radius: 280,
  itemHeight: 48,
  visibleCount: 7,
  disabled: false,
})
const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** Called for each enabled choice crossed during scrolling, dragging and momentum. */
  valueChange: [value: string]
}>()

// A short velocity projection lets a flick coast through several detents
// before the shared layout spring settles it, without a long free-running loop.
const COAST_SECONDS = 0.18
const WHEEL_SETTLE_MS = 120
// Reserve room for the glyphs and their small outward movement without
// animating padding or changing any label's measured width.
const BRACKET_SPACE = 24
const BRACKET_GAP = 4
const BRACKET_EXPANSION = 6
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const text = computed(() => ({ ...arcPickerMessages, ...props.labels }))
const reduced = useReducedMotion()
const instructionsId = useId()
const root = useTemplateRef<HTMLElement>('root')
const buttons = new Map<string, HTMLButtonElement>()

const horizontal = computed(() => props.side === 'top' || props.side === 'bottom')
const controlled = computed(() => props.modelValue !== undefined)
const firstValue = computed(() => props.options.find(option => !option.disabled)?.value)
const internal = shallowRef<string | undefined>(props.defaultValue ?? firstValue.value)
const candidate = computed(() => (controlled.value ? props.modelValue : internal.value))
const selectedValue = computed(() => {
  const value = candidate.value
  return props.options.some(option => option.value === value && !option.disabled) ? value : firstValue.value
})
// Resolve identity in the same commit as changed options. A removed choice
// cannot reappear later and silently restore an abandoned selection.
watch(selectedValue, value => {
  if (!controlled.value && internal.value !== value) internal.value = value
}, { flush: 'post' })
const selectedIndex = computed(() => Math.max(0, props.options.findIndex(option => option.value === selectedValue.value)))

const safeRadius = computed(() => Math.max(120, Number.isFinite(props.radius) ? props.radius : 280))
const rowHeight = computed(() => Math.max(32, Number.isFinite(props.itemHeight) ? props.itemHeight : 48))
const count = computed(() => Math.max(3, Number.isFinite(props.visibleCount) ? Math.floor(props.visibleCount) : 7))

const measurements = shallowRef({ width: 0, labelWidth: 0 })
const optionsKey = computed(() => JSON.stringify(props.options.map(option => [option.value, !!option.disabled])))
const labelsKey = computed(() => JSON.stringify(props.options.map(option => option.label)))
const spacing = computed(() => (horizontal.value
  ? Math.max(rowHeight.value, measurements.value.labelWidth + BRACKET_SPACE * 2)
  : rowHeight.value))
const verticalInset = computed(() => Math.max(
  BRACKET_SPACE,
  Math.min(
    measurements.value.width * 0.42,
    measurements.value.width - measurements.value.labelWidth - BRACKET_SPACE,
  ),
))
// A CSS length: unlike React, Vue does not append px to numeric style values,
// so a bare number would be dropped and leave the first render's percentage.
const verticalAnchor = computed<string>(() => (measurements.value.width
  ? `${props.side === 'left'
    ? measurements.value.width - verticalInset.value
    : verticalInset.value}px`
  : props.side === 'left'
    ? '58%'
    : '42%'))
const curveRadius = computed(() => (horizontal.value ? Math.max(safeRadius.value, spacing.value * 2) : safeRadius.value))
const shownCount = computed(() => (horizontal.value
  ? Math.min(count.value, Math.max(1, (measurements.value.width || count.value * spacing.value) / spacing.value))
  : count.value))
const horizontalHeight = computed(() => Math.ceil(Math.max(
  rowHeight.value * 2,
  curveRadius.value
    * (1 - Math.cos(Math.min(1.35, (shownCount.value * spacing.value) / (2 * curveRadius.value))))
    + rowHeight.value
    + 24,
)))

const position = useMotionValue(selectedIndex.value)
const activity = useMotionValue(0)
const expansion = useSpring(activity, glideSpring)
const frameTarget = useMotionValue(0)
const frameWidth = useSpring(frameTarget, layoutSpring)

// The selection brackets ride the measured width of the chosen label. Their
// transforms read both springs, so the outward nudge and a size change compose.
// `side` is mirrored into a motion value so the transforms follow a side switch.
const sideValue = useMotionSource(() => props.side)
const leading = useTransform(() => {
  const side = sideValue.get()
  const size = frameWidth.get()
  const amount = clamp(expansion.get(), 0, 1)
  const extent = side === 'top' || side === 'bottom' ? size / 2 : side === 'left' ? size : 0
  const gap = BRACKET_GAP + amount * BRACKET_EXPANSION
  return `translate3d(${-extent - gap}px, -50%, 0) scaleY(${1 - amount * 0.08})`
})
const trailing = useTransform(() => {
  const side = sideValue.get()
  const size = frameWidth.get()
  const amount = clamp(expansion.get(), 0, 1)
  const extent = side === 'top' || side === 'bottom' ? size / 2 : side === 'right' ? size : 0
  const gap = BRACKET_GAP + amount * BRACKET_EXPANSION
  return `translate3d(${extent + gap}px, -50%, 0) scaleY(${1 - amount * 0.08})`
})
const frameOpacity = useTransform(() => (frameWidth.get() > 0 ? 0.85 : 0))

let mounted = false
let frameMeasured = false
let animation: { stop: () => void } | undefined
let wheelTimer: ReturnType<typeof setTimeout> | undefined
let wheelTarget: number | null = null
let reconcileFrame = 0
let request: string | undefined = selectedValue.value
let tracking = false
let instant = false
let suppressClick = false
let focusWithin = false
let observer: ResizeObserver | undefined
let drag: {
  id: number
  coordinate: number
  position: number
  lastCoordinate: number
  time: number
  velocity: number
  moved: boolean
} | null = null

function measureFrame() {
  const width = buttons.get(selectedValue.value ?? '')?.offsetWidth ?? 0
  frameTarget.set(width)
  // The first measurement and keyboard changes are immediate. Pointer
  // selections retarget the same two glyphs, preserving spring velocity.
  if (!frameMeasured || instant || reduced.value) frameWidth.jump(width)
  frameMeasured = true
}

function measure() {
  const element = root.value
  if (!element) return
  const width = element.clientWidth
  const labelWidth = Math.max(0, ...Array.from(buttons.values(), button => button.offsetWidth))
  if (measurements.value.width !== width || measurements.value.labelWidth !== labelWidth) {
    measurements.value = { width, labelWidth }
  }
  // A font or truncated label can resize while the largest label stays the
  // same width. Update the frame even when the measurement itself is unchanged.
  measureFrame()
}

function setButton(value: string, element: HTMLButtonElement | null) {
  if (element) {
    buttons.set(value, element)
    observer?.observe(element)
  } else {
    buttons.delete(value)
  }
  measure()
}

// Observe untransformed sizes: animated bounds would change the spacing every
// frame. Font loading and responsive text sizes still trigger this.
function observe() {
  observer?.disconnect()
  const element = root.value
  if (!element) return
  observer = new ResizeObserver(measure)
  observer.observe(element)
  for (const button of buttons.values()) observer.observe(button)
  measure()
}

function stop() {
  animation?.stop()
  animation = undefined
  if (wheelTimer) clearTimeout(wheelTimer)
  wheelTimer = undefined
  wheelTarget = null
  if (reconcileFrame) cancelAnimationFrame(reconcileFrame) // the settle watcher is immediate, so this also runs during SSR
  tracking = false
  activity.set(0)
  if (reduced.value) expansion.jump(0)
  const pointer = drag
  drag = null
  const element = root.value
  if (pointer && element?.hasPointerCapture(pointer.id)) releasePointer(element, pointer.id)
}

function settle(index: number, immediate = false) {
  animation?.stop()
  const complete = () => {
    tracking = false
    animation = undefined
    wheelTarget = null
    activity.set(0)
  }
  // There is no frame loop before mount, so the opening detent lands directly
  // instead of scheduling an animation nothing would tick.
  if (immediate || reduced.value || !mounted) {
    position.jump(index)
    complete()
  } else {
    animation = animate(position, index, { ...layoutSpring, onComplete: complete })
  }
}

const configuration = computed(() => JSON.stringify([
  optionsKey.value,
  props.side,
  spacing.value,
  props.disabled,
  reduced.value,
]))
let previousConfiguration = configuration.value

function publish(index: number, keyboard = false) {
  const option = props.options[index]
  if (!option || option.disabled || props.disabled) return
  if (option.value === request) return
  request = option.value
  if (!controlled.value) internal.value = option.value
  emit('update:modelValue', option.value)
  emit('valueChange', option.value)
  if (!controlled.value) return
  cancelAnimationFrame(reconcileFrame)
  // Give Vue a full frame to commit the consumer's update before checking for
  // rejection. A same-frame RAF can run before that commit and cancel an
  // accepted gesture, especially when a detent is crossed inside a RAF.
  reconcileFrame = requestAnimationFrame(() => {
    reconcileFrame = requestAnimationFrame(() => {
      if (request !== option.value || selectedValue.value === option.value) return
      stop()
      request = selectedValue.value
      settle(selectedIndex.value, keyboard)
      if ((keyboard || focusWithin) && selectedValue.value !== undefined) {
        buttons.get(selectedValue.value)?.focus({ preventScroll: true })
      }
    })
  })
}

function select(index: number, keyboard = false) {
  const option = props.options[index]
  if (!option || option.disabled || props.disabled) return
  stop()
  instant = keyboard
  if (keyboard) {
    expansion.jump(0)
    frameWidth.jump(frameTarget.get())
  }
  publish(index, keyboard)
  settle(index, keyboard)
  if (keyboard) buttons.get(option.value)?.focus({ preventScroll: true })
}

function nearestEnabled(at: number) {
  let nearest = -1
  let distance = Infinity
  props.options.forEach((option, index) => {
    if (!option.disabled && Math.abs(index - at) < distance) {
      nearest = index
      distance = Math.abs(index - at)
    }
  })
  return nearest
}

// A large frame delta may cross several detents. Notify each enabled choice in
// order; never wait for the wheel-idle timer or pointer release.
useMotionValueEvent(position, 'change', at => {
  if (!tracking || props.disabled) return
  const next = nearestEnabled(at)
  if (next < 0) return
  const previous = props.options.findIndex(option => option.value === request)
  const step = next > previous ? 1 : -1
  if (previous < 0 || previous === next) publish(next)
  else {
    for (let index = previous + step; step > 0 ? index <= next : index >= next; index += step) publish(index)
  }
})

// Native (non-passive) so preventDefault actually stops the page scrolling
// behind the wheel.
function wheel(event: WheelEvent) {
  if (props.disabled || event.ctrlKey || drag?.moved || !props.options.some(option => !option.disabled)) return
  const useX = Math.abs(event.deltaX) > Math.abs(event.deltaY)
  if (!horizontal.value && useX) return
  const element = root.value
  const delta = (horizontal.value && useX ? event.deltaX : event.deltaY)
    * (event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? horizontal.value
          ? element?.clientWidth ?? 0
          : element?.clientHeight ?? 0
        : 1)
  if (!delta) return
  const enabled = props.options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => !option.disabled)
  const first = enabled[0]?.index ?? 0
  const last = enabled[enabled.length - 1]?.index ?? first
  const from = wheelTarget ?? position.get()
  // At an end, release wheel events back to the page's own scroll.
  if ((from <= first && delta < 0) || (from >= last && delta > 0)) return
  event.preventDefault()
  if (wheelTimer) clearTimeout(wheelTimer)
  if (reduced.value) {
    const at = enabled.findIndex(({ option }) => option.value === request)
    const next = enabled[clamp(at + Math.sign(delta), 0, enabled.length - 1)]
    if (next) select(next.index, true)
  } else {
    if (wheelTarget === null) {
      animation?.stop()
      animation = undefined
    }
    instant = false
    tracking = true
    activity.set(1)
    const next = clamp(from + delta / spacing.value, first, last)
    // Wheel deltas already contain trackpad momentum. Follow them directly;
    // the transforms coalesce visual writes to one per frame. A spring here
    // lags behind frequent input and can feel stuck until scrolling stops.
    wheelTarget = next
    position.set(next)
    wheelTimer = setTimeout(() => {
      wheelTimer = undefined
      wheelTarget = null
      settle(nearestEnabled(next))
    }, WHEEL_SETTLE_MS)
  }
}

function keyboard(event: KeyboardEvent) {
  if (event.defaultPrevented || props.disabled) return
  const enabled = props.options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => !option.disabled)
  if (!enabled.length) return
  const at = Math.max(0, enabled.findIndex(({ option }) => option.value === request))
  let next: number
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      next = at + (event.shiftKey ? 5 : 1)
      break
    case 'ArrowUp':
    case 'ArrowLeft':
      next = at - (event.shiftKey ? 5 : 1)
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = enabled.length - 1
      break
    case 'PageDown':
      next = at + 5
      break
    case 'PageUp':
      next = at - 5
      break
    default:
      return
  }
  event.preventDefault()
  const option = enabled[clamp(next, 0, enabled.length - 1)]
  if (option) select(option.index, true)
}

function release(event: PointerEvent, cancelled: boolean) {
  const current = drag
  if (!current || current.id !== event.pointerId) return
  drag = null
  const element = root.value
  if (element?.hasPointerCapture(event.pointerId)) releasePointer(element, event.pointerId)
  if (!current.moved) return
  suppressClick = true
  if (cancelled) {
    tracking = false
    activity.set(0)
    settle(selectedIndex.value)
  } else {
    const velocity = performance.now() - current.time > 100 ? 0 : current.velocity
    settle(nearestEnabled(position.get() + (reduced.value ? 0 : velocity * COAST_SECONDS)))
  }
}

function pointerDown(event: PointerEvent) {
  if (event.defaultPrevented || props.disabled || selectedValue.value === undefined || event.button !== 0 || !event.isPrimary) return
  stop()
  suppressClick = false
  const coordinate = horizontal.value ? event.clientX : event.clientY
  drag = {
    id: event.pointerId,
    coordinate,
    position: position.get(),
    lastCoordinate: coordinate,
    time: performance.now(),
    velocity: 0,
    moved: false,
  }
}

function pointerMove(event: PointerEvent) {
  const current = drag
  if (event.defaultPrevented || !current || current.id !== event.pointerId) return
  const coordinate = horizontal.value ? event.clientX : event.clientY
  const delta = coordinate - current.coordinate
  if (!current.moved && Math.abs(delta) < 6) return
  current.moved = true
  tracking = true
  instant = false
  activity.set(reduced.value ? 0 : 1)
  const element = root.value
  if (element && !element.hasPointerCapture(event.pointerId)) capturePointer(element, event.pointerId)
  const now = performance.now()
  const elapsed = Math.max(8, now - current.time)
  current.velocity = current.velocity * 0.35 + ((current.lastCoordinate - coordinate) / spacing.value / elapsed) * 1000 * 0.65
  current.lastCoordinate = coordinate
  current.time = now
  const next = clamp(current.position - delta / spacing.value, 0, Math.max(0, props.options.length - 1))
  position.set(reduced.value ? Math.round(next) : next)
}

function clickCapture(event: MouseEvent) {
  if (suppressClick && event.detail > 0) {
    event.preventDefault()
    event.stopPropagation()
    suppressClick = false
  }
}

function focusIn() {
  focusWithin = true
}

function focusOut(event: FocusEvent) {
  if (event.relatedTarget && !root.value?.contains(event.relatedTarget as Node)) focusWithin = false
}

watch(
  [selectedValue, selectedIndex, configuration, () => props.disabled, reduced],
  () => {
    const changed = previousConfiguration !== configuration.value
    previousConfiguration = configuration.value
    // An accepted live selection must not cancel the gesture or snap its
    // floating position. External changes still own the control immediately.
    if (changed || !tracking || selectedValue.value !== request) {
      stop()
      request = selectedValue.value
      settle(selectedIndex.value, instant || props.disabled || reduced.value)
    }
    if (changed) suppressClick = false
    instant = false
    if (focusWithin && selectedValue.value !== undefined && !props.disabled) {
      buttons.get(selectedValue.value)?.focus({ preventScroll: true })
    }
  },
  { flush: 'post', immediate: true },
)

watch([selectedValue, reduced], () => measureFrame(), { flush: 'post' })
watch([optionsKey, labelsKey], () => {
  if (mounted) observe()
}, { flush: 'post' })

onMounted(() => {
  mounted = true
  observe()
  root.value?.addEventListener('wheel', wheel, { passive: false })
})

onBeforeUnmount(() => {
  root.value?.removeEventListener('wheel', wheel)
  observer?.disconnect()
  observer = undefined
  stop()
  cancelAnimationFrame(reconcileFrame)
  if (wheelTimer) clearTimeout(wheelTimer)
  wheelTimer = undefined
})

const rootStyle = computed(() => {
  const mask = `linear-gradient(to ${horizontal.value ? 'right' : 'bottom'}, transparent, black 12%, black 88%, transparent)`
  return {
    touchAction: horizontal.value ? 'pan-y pinch-zoom' : 'pan-x pinch-zoom',
    height: horizontal.value ? `${horizontalHeight.value}px` : `${count.value * rowHeight.value}px`,
    maskImage: mask,
    WebkitMaskImage: mask,
  }
})
</script>

<template>
  <div
    ref="root"
    v-bind="{ ...$attrs, class: undefined, style: undefined }"
    role="radiogroup"
    data-slot="arc-picker"
    :data-side="side"
    :aria-label="($attrs['aria-label'] as string | undefined) ?? label ?? text.label"
    :aria-describedby="[($attrs['aria-describedby'] as string | undefined), instructionsId].filter(Boolean).join(' ')"
    :aria-disabled="disabled || undefined"
    :aria-orientation="horizontal ? 'horizontal' : 'vertical'"
    :class="['be-arc', disabled && 'is-disabled', $attrs.class]"
    :style="[rootStyle, $attrs.style]"
    @keydown="keyboard"
    @focusin="focusIn"
    @focusout="focusOut"
    @pointerdown="pointerDown"
    @pointermove="pointerMove"
    @pointerup="release($event, false)"
    @pointercancel="release($event, true)"
    @lostpointercapture="release($event, true)"
    @click.capture="clickCapture"
  >
    <span :id="instructionsId" class="be-arc-instructions">
      {{ horizontal ? text.instructionsHorizontal : text.instructionsVertical }}
    </span>
    <input v-if="name" type="hidden" :name="name" :value="selectedValue ?? ''" :disabled="disabled" />
    <ArcPickerOptionItem
      v-for="(option, index) in options"
      :key="option.value"
      :option="option"
      :index="index"
      :position="position"
      :vertical-anchor="verticalAnchor"
      :radius="curveRadius"
      :item-height="spacing"
      :visible-count="shownCount"
      :side="side"
      :selected="option.value === selectedValue"
      :disabled="disabled"
      :set-ref="element => setButton(option.value, element)"
      @select="select(index)"
    />
    <div
      aria-hidden="true"
      data-slot="arc-picker-selection-frame"
      class="be-arc-frame"
      :style="{
        top: horizontal ? (side === 'top' ? '36px' : 'calc(100% - 36px)') : '50%',
        left: horizontal ? '50%' : verticalAnchor,
        visibility: selectedValue !== undefined ? undefined : 'hidden',
      }"
    >
      <motion.span
        data-slot="arc-picker-bracket"
        data-edge="leading"
        class="be-arc-bracket is-leading"
        :style="{ transform: leading, opacity: frameOpacity }"
      >[</motion.span>
      <motion.span
        data-slot="arc-picker-bracket"
        data-edge="trailing"
        class="be-arc-bracket is-trailing"
        :style="{ transform: trailing, opacity: frameOpacity }"
      >]</motion.span>
    </div>
    <span v-if="!options.length" class="be-arc-empty">{{ text.empty }}</span>
  </div>
</template>

<style scoped>
.be-arc {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.be-arc:active { cursor: grabbing; }
.be-arc.is-disabled { cursor: default; opacity: 0.5; }
.be-arc-frame {
  pointer-events: none;
  position: absolute;
  width: 0;
  height: 0;
  color: var(--beui-primary);
  font-size: 1.5rem;
  line-height: 2rem;
  font-weight: 300;
}
.be-arc-bracket { position: absolute; }
.be-arc-bracket.is-leading { right: 0; }
.be-arc-bracket.is-trailing { left: 0; }
.be-arc-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--beui-muted-foreground);
  font-size: 0.875rem;
  line-height: 1.25rem;
}
.be-arc-instructions {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  white-space: nowrap;
  border: 0;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
}
@media (prefers-reduced-motion: reduce) {
  .be-arc { cursor: default; }
}
</style>

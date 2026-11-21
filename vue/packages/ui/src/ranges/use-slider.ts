import { useMotionValue, useSpring, useTransform } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { capturePointer, releasePointer } from '../core/touch'
import { glideSpringConfig, type SliderBaseProps } from './types'

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value))

/** Nearest legal value on [min, max] for the given step. `max` counts as a
 * candidate when the step does not divide the range, so a pointer near the end
 * does not snap back onto the last whole step. */
export function snapSliderValue(next: number, min: number, max: number, step: number): number {
  // Neither case has a grid to walk. An empty range has exactly one legal
  // point, and a non-positive step only needs a clamp, which also keeps the
  // division below away from zero.
  if (!(max > min)) return min
  if (!(step > 0)) return clamp(next, min, max)
  const whole = Math.floor(Number(((max - min) / step).toFixed(6)))
  const lastWhole = Number((min + whole * step).toFixed(6))
  const toGrid = clamp(Math.round((next - min) / step) * step + min, min, lastWhole)
  const snapped = lastWhole < max && Math.abs(next - max) <= Math.abs(next - toGrid) ? max : toGrid
  return Number(snapped.toFixed(6))
}

export interface UseSliderOptions {
  /** Override the stride (the inline slider walks a finer grid than its stops). */
  step?: () => number
  /** Fallback aria-label when none is passed. */
  fallbackLabel?: () => string | undefined
  /** Announcement used when the caller passes no `formatValueText`. */
  formatValueText?: (value: number) => string | undefined
}

/**
 * Shared value + input plumbing for slider designs: controlled/uncontrolled
 * value, step snapping, pointer-capture drag along a track and arrow-key
 * control. Visuals and motion live in the component; this only owns the number.
 */
export function useSlider(
  props: SliderBaseProps,
  emitValue: (value: number) => void,
  options: UseSliderOptions = {},
) {
  // The focusable slider element. Either a plain element or a motion component.
  const sliderRef = shallowRef<unknown>(null)
  let dragging = false
  const isDragging = shallowRef(false)
  const draft = shallowRef(props.defaultValue ?? 0)
  const controlled = computed(() => props.modelValue !== undefined)
  // Collapse inverted or empty ranges and non-positive steps here, so that
  // percent, ticks and the keyboard maths never divide by zero or walk a NaN grid.
  const min = computed(() => props.min ?? 0)
  const max = computed(() => { const hi = props.max ?? 100; return hi > min.value ? hi : min.value })
  const step = computed(() => { const raw = options.step ? options.step() : props.step ?? 1; return raw > 0 ? raw : 1 })
  const current = computed(() => clamp(controlled.value ? props.modelValue as number : draft.value, min.value, max.value))
  const percent = computed(() => max.value > min.value ? ((current.value - min.value) / (max.value - min.value)) * 100 : 0)

  function commit(next: number) {
    const clean = snapSliderValue(next, min.value, max.value, step.value)
    if (!controlled.value) draft.value = clean
    emitValue(clean)
  }
  function commitFromX(clientX: number, track: HTMLElement) {
    const rect = track.getBoundingClientRect()
    if (rect.width === 0) return
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    commit(min.value + ratio * (max.value - min.value))
  }
  function focusSlider() {
    const raw = sliderRef.value as { $el?: HTMLElement } & HTMLElement | null
    const el = (raw?.$el ?? raw) as HTMLElement | null
    el?.focus?.({ preventScroll: true })
  }

  function onPointerDown(event: PointerEvent) {
    if (props.disabled) return
    // Start the drag first: capture is a convenience, and a browser that
    // refuses it must not take the drag down with it.
    dragging = true
    isDragging.value = true
    capturePointer(event.currentTarget as Element, event.pointerId)
    // A click on the track should land keyboard focus on the handle.
    focusSlider()
    commitFromX(event.clientX, event.currentTarget as HTMLElement)
  }
  function onPointerMove(event: PointerEvent) {
    if (!dragging || props.disabled) return
    commitFromX(event.clientX, event.currentTarget as HTMLElement)
  }
  function endDrag(event: PointerEvent) {
    releasePointer(event.currentTarget as Element, event.pointerId)
    dragging = false
    isDragging.value = false
  }
  function onKeyDown(event: KeyboardEvent) {
    if (props.disabled) return
    const at = current.value
    const stride = step.value
    const map: Record<string, number> = {
      ArrowRight: at + stride, ArrowUp: at + stride, ArrowLeft: at - stride, ArrowDown: at - stride,
      PageUp: at + stride * 10, PageDown: at - stride * 10, Home: min.value, End: max.value,
    }
    if (event.key in map) {
      event.preventDefault()
      commit(map[event.key])
    }
  }

  /** Pointer handlers for the track element — drag anywhere on it. */
  const trackEvents = { onPointerdown: onPointerDown, onPointermove: onPointerMove, onPointerup: endDrag, onPointercancel: endDrag, onLostpointercapture: endDrag }
  /** ARIA + keyboard attributes for the focusable slider element. */
  const aria = computed(() => ({
    role: 'slider',
    tabindex: props.disabled ? -1 : 0,
    'aria-label': props.ariaLabel ?? props.label ?? options.fallbackLabel?.() ?? 'Value',
    'aria-valuemin': min.value,
    'aria-valuemax': max.value,
    'aria-valuenow': current.value,
    'aria-valuetext': (props.formatValueText ?? options.formatValueText)?.(current.value),
    'aria-disabled': props.disabled || undefined,
  }))

  return { sliderRef, current, percent, dragging: isDragging, min, max, step, commit, focusSlider, trackEvents, aria, onKeyDown }
}

/** Spring-smoothed slider position (0-100): the thumb and fill glide to a new
 * value instead of jumping. Reduced motion follows the value exactly. */
export function useGlidePosition(percent: { value: number }) {
  const reduce = useReducedMotion()
  const target = useMotionValue(percent.value)
  const smooth = useSpring(target, glideSpringConfig)
  const stop = watch(() => percent.value, value => {
    target.set(value)
    if (reduce.value) smooth.jump(value)
  }, { flush: 'sync' })
  onBeforeUnmount(stop)
  const pos = useTransform(() => (reduce.value ? target.get() : smooth.get()))
  return { pos, reduce, target }
}

/** Track width of an element, kept current with a ResizeObserver. */
export function observeWidth(width: { value: number }, element: () => HTMLElement | null | undefined) {
  const el = element()
  if (!el) return () => {}
  const measure = () => {
    const next = el.getBoundingClientRect().width
    if (next > 0) width.value = next
  }
  measure()
  const observer = new ResizeObserver(measure)
  observer.observe(el)
  return () => observer.disconnect()
}

<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const colorPickerMessages = {
  dialog: 'Color picker',
  area: 'Saturation and brightness',
  areaRole: '2D slider',
  areaValue: 'Saturation {saturation}%, brightness {brightness}%',
  hue: 'Hue',
  hueValue: '{value} degrees',
  opacity: 'Opacity',
  opacityValue: '{value}%',
  hex: 'Hex color',
  saturation: 'Saturation',
  lightness: 'Lightness',
  red: 'Red',
  green: 'Green',
  blue: 'Blue',
  opacityPercent: 'Opacity percent',
  eyeDropper: 'Pick a color from the screen',
  format: 'Switch color format',
  presets: 'Presets',
}
export type ColorPickerMessages = typeof colorPickerMessages
export interface ColorPickerPreset { value: string; label: string }
</script>

<script setup lang="ts">
import { AnimatePresence, arc, motion, useMotionValue, useSpring, useTransform, useVelocity } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut, layoutSpring, pressSpring } from '../core/motion'
import { useDismiss } from './popover/pop-helpers'
import { bound, fromHsl, fromRgb, parseColor, toHex, toHsl, toRgb, type Hsva } from './colors'

const props = withDefaults(defineProps<{
  label?: string
  presets?: readonly ColorPickerPreset[]
  disabled?: boolean
  name?: string
  /** Allow transparency. When false the value is always opaque. */
  alpha?: boolean
  labels?: Partial<ColorPickerMessages>
}>(), { label: 'Color', presets: () => [], alpha: true })
const model = defineModel<string>({ default: '#3478f6' })
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ commit: [value: string] }>()

const t = computed(() => ({ ...colorPickerMessages, ...props.labels }))
const reduce = useReducedMotion()
const anchor = useTemplateRef<HTMLButtonElement>('anchor')
const area = shallowRef<HTMLDivElement | null>(null)
function bindArea(node: unknown) { area.value = ((node as { $el?: HTMLDivElement } | null)?.$el ?? node) as HTMLDivElement | null }
const labelBox = useTemplateRef<HTMLSpanElement>('labelBox')
const channelFields = useTemplateRef<HTMLDivElement>('channelFields')

const initial: Hsva = { hue: 220, saturation: 80, brightness: 96, alpha: 1 }
const channels = shallowRef<Hsva>(parseColor(model.value, initial) ?? initial)
// A controlled value the picker did not emit itself is re-read here, so the
// thumbs never paint a stale colour for a frame.
watch(model, next => {
  if (next === hex.value) return
  const parsed = parseColor(next, channels.value)
  if (parsed) channels.value = parsed
})
const hex = computed(() => toHex(props.alpha ? channels.value : { ...channels.value, alpha: 1 }))
const rgb = computed(() => toRgb(channels.value))

function update(next: Hsva) {
  const clean: Hsva = {
    hue: Math.min(360, Math.max(0, next.hue)),
    saturation: bound(next.saturation),
    brightness: bound(next.brightness),
    alpha: props.alpha ? bound(next.alpha, 1) : 1,
  }
  const nextHex = toHex(clean)
  const changed = nextHex !== hex.value
  channels.value = clean
  if (changed) model.value = nextHex
}
function commit() { emit('commit', hex.value) }
function applyHex(input: string) {
  const parsed = parseColor(input, channels.value)
  if (!parsed) return false
  update(parsed)
  return true
}

// --- Glide springs --------------------------------------------------------
// Dragged handles ride a critically damped spring, so they follow the pointer
// smoothly and never rebound off an end.
function useGlide(source: () => number) {
  const target = useMotionValue(source())
  const spring = useSpring(target, { stiffness: 700, damping: 50, mass: 0.5 })
  watch(source, next => {
    if (reduce.value) spring.jump(next)
    else target.set(next)
  })
  const offset = useTransform(spring, value => `${value}%`)
  return { spring, offset }
}

// --- Saturation / brightness area ----------------------------------------
const areaX = useGlide(() => channels.value.saturation)
const areaY = useGlide(() => 100 - channels.value.brightness)
const dragging = shallowRef(false)

function areaPoint(event: PointerEvent) {
  const element = area.value
  if (!element) return
  const box = element.getBoundingClientRect()
  if (!box.width || !box.height) return
  update({
    ...channels.value,
    saturation: ((event.clientX - box.left) / box.width) * 100,
    brightness: (1 - (event.clientY - box.top) / box.height) * 100,
  })
}
function areaDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return
  dragging.value = true
  try { area.value?.setPointerCapture(event.pointerId) } catch { /* pointer already gone */ }
  areaPoint(event)
}
function areaUp(event: PointerEvent) {
  if (!dragging.value) return
  try { if (area.value?.hasPointerCapture(event.pointerId)) area.value.releasePointerCapture(event.pointerId) } catch { /* dropped */ }
  dragging.value = false
  commit()
}
function areaMove(event: PointerEvent) { if (dragging.value) areaPoint(event) }

// --- Keyboard stepping ----------------------------------------------------
/** Arrow, Page and Home/End stepping. Returns the delta, or null when unhandled. */
function keyStep(event: KeyboardEvent, big: number): { axis: 'x' | 'y'; delta: number } | 'min' | 'max' | null {
  const step = event.shiftKey ? big : 1
  switch (event.key) {
    case 'ArrowRight': return { axis: 'x', delta: step }
    case 'ArrowLeft': return { axis: 'x', delta: -step }
    case 'ArrowUp': return { axis: 'y', delta: step }
    case 'ArrowDown': return { axis: 'y', delta: -step }
    case 'PageUp': return { axis: 'y', delta: big }
    case 'PageDown': return { axis: 'y', delta: -big }
    case 'Home': return 'min'
    case 'End': return 'max'
    default: return null
  }
}
function areaKeys(event: KeyboardEvent) {
  if (props.disabled) return
  const step = keyStep(event, 10)
  if (!step) return
  event.preventDefault()
  if (step === 'min') update({ ...channels.value, saturation: 0 })
  else if (step === 'max') update({ ...channels.value, saturation: 100 })
  else if (step.axis === 'x') update({ ...channels.value, saturation: channels.value.saturation + step.delta })
  else update({ ...channels.value, brightness: channels.value.brightness + step.delta })
  commit()
}

// --- Sliders (hue, alpha) -------------------------------------------------
const hueX = useGlide(() => channels.value.hue / 3.6)
const alphaX = useGlide(() => channels.value.alpha * 100)
const hueRail = useTemplateRef<HTMLDivElement>('hueRail')
const alphaRail = useTemplateRef<HTMLDivElement>('alphaRail')
const hueDragging = shallowRef(false)
const alphaDragging = shallowRef(false)

function railPoint(rail: HTMLDivElement | null, event: PointerEvent) {
  const box = rail?.getBoundingClientRect()
  if (!box || !box.width) return 0
  return Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
}
function hueDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return
  hueDragging.value = true
  try { hueRail.value?.setPointerCapture(event.pointerId) } catch { /* already gone */ }
  update({ ...channels.value, hue: railPoint(hueRail.value, event) * 360 })
}
function hueMove(event: PointerEvent) { if (hueDragging.value) update({ ...channels.value, hue: railPoint(hueRail.value, event) * 360 }) }
function hueUp(event: PointerEvent) {
  if (!hueDragging.value) return
  try { if (hueRail.value?.hasPointerCapture(event.pointerId)) hueRail.value.releasePointerCapture(event.pointerId) } catch { /* dropped */ }
  hueDragging.value = false
  commit()
}
function alphaDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) return
  alphaDragging.value = true
  try { alphaRail.value?.setPointerCapture(event.pointerId) } catch { /* already gone */ }
  update({ ...channels.value, alpha: railPoint(alphaRail.value, event) })
}
function alphaMove(event: PointerEvent) { if (alphaDragging.value) update({ ...channels.value, alpha: railPoint(alphaRail.value, event) }) }
function alphaUp(event: PointerEvent) {
  if (!alphaDragging.value) return
  try { if (alphaRail.value?.hasPointerCapture(event.pointerId)) alphaRail.value.releasePointerCapture(event.pointerId) } catch { /* dropped */ }
  alphaDragging.value = false
  commit()
}
function hueKeys(event: KeyboardEvent) {
  if (props.disabled) return
  const step = keyStep(event, 10)
  if (!step) return
  event.preventDefault()
  if (step === 'min') update({ ...channels.value, hue: 0 })
  else if (step === 'max') update({ ...channels.value, hue: 360 })
  else update({ ...channels.value, hue: channels.value.hue + step.delta })
  commit()
}
function alphaKeys(event: KeyboardEvent) {
  if (props.disabled) return
  const step = keyStep(event, 10)
  if (!step) return
  event.preventDefault()
  const percent = Math.round(channels.value.alpha * 100)
  if (step === 'min') update({ ...channels.value, alpha: 0 })
  else if (step === 'max') update({ ...channels.value, alpha: 1 })
  else update({ ...channels.value, alpha: (percent + step.delta) / 100 })
  commit()
}

// --- Loupe ---------------------------------------------------------------
// The loupe lifts with a visible overshoot so it reads as picked up, unlike
// the critically damped glide the thumb itself rides on.
const LOUPE_LIFT = { type: 'spring', stiffness: 520, damping: 24, mass: 0.6 } as const
const LOUPE_DROP = { duration: 0.12, ease: easeOut } as const
// Glide velocity in %/s mapped to a pendulum swing, so the loupe trails the drag.
const LOUPE_TILT_INPUT = [-400, 400]
const LOUPE_TILT_DEGREES = [16, -16]
const areaVelocity = useVelocity(areaX.spring)
const loupeTilt = useSpring(useTransform(areaVelocity, LOUPE_TILT_INPUT, LOUPE_TILT_DEGREES, { clamp: true }), pressSpring)
const lifted = computed(() => dragging.value && !reduce.value)

// --- Format and fields ----------------------------------------------------
const format = shallowRef<'hex' | 'rgb' | 'hsl'>('hex')
const FORMATS = ['hex', 'rgb', 'hsl'] as const
const formatValues = computed(() => (format.value === 'rgb' ? rgb.value : toHsl(channels.value)))
const formatLabels = computed(() => (format.value === 'rgb' ? [t.value.red, t.value.green, t.value.blue] : [t.value.hue, t.value.saturation, t.value.lightness]))
const draft = shallowRef<string | null>(null)
const channelDraft = shallowRef<string | null>(null)
const fieldWrap = useTemplateRef<HTMLDivElement>('fieldWrap')

function setChannel(index: number, value: number) {
  const next = [...formatValues.value]
  next[index] = value
  update(format.value === 'rgb' ? fromRgb(next, channels.value) : fromHsl(next, channels.value))
}
function settleHex() {
  if (draft.value === null) return
  if (!applyHex(draft.value)) {
    // A horizontal shake for rejected input; dropped under reduced motion.
    const element = fieldWrap.value
    if (element && !reduce.value) animateShake(element)
  } else commit()
  draft.value = null
}
function animateShake(element: HTMLElement) {
  const frames = [0, -5, 5, -3, 3, 0].map(x => ({ transform: `translateX(${x}px)` }))
  element.animate(frames, { duration: 300, easing: 'ease-in-out' })
}
function hexInput(event: Event) {
  const field = event.target as HTMLInputElement
  const next = field.value.replace(/^#/, '')
  draft.value = next
  // Live preview only for full-length entries, so "abc" mid-way to "abcdef"
  // does not flash a short-form colour.
  if ((next.length === 6 || next.length === 8) && applyHex(next)) return
}
function hexKeys(event: KeyboardEvent) {
  if (event.key === 'Enter') settleHex()
  // Escape drops the half-typed value; the panel still dismisses on it, as in
  // the React version, where only the draft reset is prevented.
  if (event.key === 'Escape' && draft.value !== null) draft.value = null
}
function channelInput(index: number, event: Event) {
  const field = event.target as HTMLInputElement
  const next = field.value.replace(/[^\d]/g, '').slice(0, 3)
  channelDraft.value = next
  if (next !== '') setChannel(index, Math.min(format.value === 'rgb' ? 255 : index === 0 ? 360 : 100, Number(next)))
}
function channelKeys(index: number, event: KeyboardEvent) {
  const current = Math.round(formatValues.value[index] ?? 0)
  const delta = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0
  if (delta) {
    event.preventDefault()
    channelDraft.value = null
    setChannel(index, Math.min(format.value === 'rgb' ? 255 : index === 0 ? 360 : 100, Math.max(0, current + delta * (event.shiftKey ? 10 : 1))))
    commit()
  } else if (event.key === 'Enter') {
    channelDraft.value = null
    commit()
  }
}
function channelValue(index: number) {
  return channelDraft.value ?? String(Math.round(formatValues.value[index] ?? 0))
}

// --- Eye dropper ----------------------------------------------------------
type Dropper = { open: (options?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }> }
const eye = shallowRef<new () => Dropper>()
let sampling: AbortController | undefined
onMounted(() => { eye.value = (window as Window & { EyeDropper?: new () => Dropper }).EyeDropper })
onBeforeUnmount(() => sampling?.abort())
async function sample() {
  if (!eye.value) return
  sampling?.abort()
  sampling = new AbortController()
  try {
    const result = await new eye.value().open({ signal: sampling.signal })
    if (applyHex(result.sRGBHex)) commit()
  } catch {
    // Dismissed with Escape.
  }
}

// --- Presets --------------------------------------------------------------
// The selection ring hops between swatches over a low arc instead of sliding.
// arc() bends with distance (the apex sits at half of strength x distance), so
// a neighbour gets a ~5px hop and a jump across the row clears the fields above.
// Automatic direction always puts a horizontal bulge below the row; a negative
// strength mirrors it above, in both directions of travel.
const PRESET_HOP = { ...layoutSpring, layout: { ...layoutSpring, path: arc({ strength: -0.3 }) } }
// A per-instance layoutId, stable across server and client so hydration matches.
const presetId = `color-picker-preset-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const normalizedPresets = computed(() => props.presets.map(preset => {
  const parsed = parseColor(preset.value, initial)
  return { ...preset, normalized: parsed ? toHex(parsed) : preset.value, parsed }
}))

// --- Trigger label --------------------------------------------------------
// The hex beside the chip. Its width springs to the text instead of snapping,
// so the trigger never jumps when the hex gains or drops its alpha pair. Width
// is a layout property, but this is one small inline box with nothing laid out
// after it inside the button, and a transform cannot resize the border.
const labelWidth = shallowRef<number | null>(null)
let labelObserver: ResizeObserver | undefined
onMounted(() => {
  const text = labelBox.value
  if (!text) return
  const measure = () => { labelWidth.value = text.offsetWidth }
  measure()
  labelObserver = new ResizeObserver(measure)
  labelObserver.observe(text)
})
onBeforeUnmount(() => labelObserver?.disconnect())
const alphaSuffix = computed(() => hex.value.slice(7))
const labelTransition = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))

// --- Panel ----------------------------------------------------------------
// Laid out under the trigger, not portalled: the chip in the trigger grows into
// the area, so both carry one layout id. Closes on outside press and Escape.
const MORPH = { type: 'spring', duration: 0.5, bounce: 0.2 } as const
const VIEWPORT_GUTTER = 8
const panelId = `beui-color-picker-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const chipId = `${panelId}-chip`
const panelEl = shallowRef<HTMLElement | null>(null)
function bindPanel(node: unknown) { panelEl.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node) as HTMLElement | null }
function dismiss() { open.value = false }
useDismiss(open, dismiss, target => Boolean(panelEl.value?.contains(target) || anchor.value?.contains(target)))
// Keep the panel on screen horizontally, before motion measures the area.
function keepOnScreen() {
  const panel = panelEl.value
  if (!panel) return
  panel.style.marginLeft = '0px'
  const rect = panel.getBoundingClientRect()
  const max = document.documentElement.clientWidth - VIEWPORT_GUTTER
  let shift = 0
  if (rect.right > max) shift = max - rect.right
  if (rect.left + shift < VIEWPORT_GUTTER) shift = VIEWPORT_GUTTER - rect.left
  panel.style.marginLeft = `${shift}px`
}
let mountedOnce = false
onMounted(() => { mountedOnce = true })
watch(open, (next, previous) => {
  if (!mountedOnce) return
  if (next) {
    nextTick(() => {
      keepOnScreen()
      panelEl.value?.querySelector<HTMLElement>('[role="slider"]:not([aria-disabled]), input:not(:disabled), button:not(:disabled)')?.focus({ preventScroll: true })
    })
    return
  }
  // The exit keeps the old vnode, so take the panel out of focus order and
  // pointer reach by hand the moment it starts leaving.
  const panel = panelEl.value
  const active = document.activeElement
  if (panel) panel.inert = true
  if (previous && (!active || active === document.body || panel?.contains(active))) anchor.value?.focus({ preventScroll: true })
}, { flush: 'sync' })
const stagger = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))
function itemAnimation(row: number) {
  return reduce.value
    ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: -6, filter: 'blur(4px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' } }
}
const PANEL_ITEM_EXIT = { opacity: 0, transition: { duration: 0.1 } }
const PANEL_DELAY = 0.1
const PANEL_STAGGER = 0.035
</script>

<template>
  <div class="be-picker">
    <input v-if="name" type="hidden" :name="name" :value="hex" :disabled="disabled" />
    <button ref="anchor" type="button" class="be-picker-trigger" :disabled="disabled" :aria-haspopup="'dialog'" :aria-expanded="open"
      :aria-controls="open ? `${panelId}-content` : undefined" :aria-label="label" @click="open = !open">
      <span class="be-picker-socket" aria-hidden="true">
        <motion.span v-if="!open" :layout-id="reduce ? undefined : chipId" :transition="MORPH" class="be-picker-chip">
          <span class="be-picker-chip-fill" :style="{ backgroundColor: hex }" />
        </motion.span>
      </span>
      <motion.span class="be-picker-label" :initial="false" :animate="{ width: labelWidth === null ? 'auto' : labelWidth }" :transition="labelTransition">
        <span ref="labelBox" class="be-picker-label-text">
          {{ hex.slice(0, 7).toUpperCase() }}
          <Transition name="be-picker-alpha">
            <span v-if="alphaSuffix" class="be-picker-alpha" :key="alphaSuffix">{{ alphaSuffix.toUpperCase() }}</span>
          </Transition>
        </span>
      </motion.span>
    </button>

    <AnimatePresence>
      <motion.div v-if="open" :ref="bindPanel" :id="`${panelId}-content`" role="dialog" :aria-label="label" class="be-picker-panel">
        <motion.div aria-hidden="true" class="be-picker-surface" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.16, ease: easeOut, delay: PANEL_DELAY }" />
        
      
              <motion.div :ref="bindArea" class="be-picker-area" role="slider" :layout-id="reduce ? undefined : chipId" :layout-dependency="open" :transition="MORPH" tabindex="0" :aria-label="t.area" :aria-roledescription="t.areaRole"
          :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="Math.round(channels.saturation)"
          :aria-valuetext="t.areaValue.replace('{saturation}', String(Math.round(channels.saturation))).replace('{brightness}', String(Math.round(channels.brightness)))"
          :aria-disabled="disabled || undefined"
          :style="{ borderRadius: '12px', background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${channels.hue} 100% 50%))` }"
          :data-disabled="disabled || undefined"
          @keydown="areaKeys" @pointerdown="areaDown" @pointermove="areaMove" @pointerup="areaUp" @pointercancel="areaUp">
          <motion.div v-if="!reduce" aria-hidden="true" class="be-picker-dissolve" :style="{ backgroundColor: hex }" :initial="{ opacity: 1 }" :animate="{ opacity: 0 }" :transition="{ duration: 0.4, ease: easeOut, delay: 0.06 }" />
          <span class="be-picker-ring" aria-hidden="true" />
          <motion.div class="be-picker-thumb-fade" :initial="reduce ? false : { opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.2, delay: 0.22 }">
          <motion.div class="be-picker-thumb-plane" :style="{ x: areaX.offset, y: areaY.offset }">
            <div class="be-picker-thumb-zone">
              <motion.span class="be-picker-thumb" :animate="{ scale: lifted ? 0.78 : 1 }" :transition="pressSpring"
                :style="{ backgroundColor: `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})` }" aria-hidden="true" />
              <Transition name="be-picker-loupe">
                <motion.span v-if="lifted" class="be-picker-loupe" aria-hidden="true"
                  :style="{ rotate: loupeTilt }" :initial="{ opacity: 0, scale: 0.3, y: 16 }"
                  :animate="{ opacity: 1, scale: 1, y: 0, transition: LOUPE_LIFT }"
                  :exit="{ opacity: 0, scale: 0.3, y: 16, transition: LOUPE_DROP }">
                  <span class="be-picker-loupe-square">
                    <span class="be-picker-loupe-fill" :style="{ background: hex }" />
                  </span>
                </motion.span>
              </Transition>
            </div>
          </motion.div>
          </motion.div>
        </motion.div>
<motion.div class="be-picker-row" :initial="itemAnimation(2).initial" :animate="itemAnimation(2).animate" :exit="PANEL_ITEM_EXIT" :transition="{ ...stagger, delay: PANEL_DELAY + PANEL_STAGGER }">
        <motion.button v-if="eye" type="button" class="be-picker-eye" :aria-label="t.eyeDropper" :disabled="disabled"
          :while-press="reduce || disabled ? undefined : { scale: 0.92 }" :transition="pressSpring" @click="sample">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
          </svg>
        </motion.button>
        <div class="be-picker-sliders">
          <div class="be-picker-slider" :style="{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }">
            <span class="be-picker-rail-ring" aria-hidden="true" />
            <div ref="hueRail" class="be-picker-rail" @pointerdown="hueDown" @pointermove="hueMove" @pointerup="hueUp" @pointercancel="hueUp">
              <motion.div class="be-picker-thumb-plane" :style="{ x: hueX.offset }">
                <div class="be-picker-thumb-zone">
                  <div class="be-picker-thumb be-picker-hue-thumb" role="slider" tabindex="0" aria-orientation="horizontal"
                    :aria-label="t.hue" :aria-valuemin="0" :aria-valuemax="360" :aria-valuenow="Math.round(channels.hue)"
                    :aria-valuetext="t.hueValue.replace('{value}', String(Math.round(channels.hue)))" :aria-disabled="disabled || undefined"
                    :style="{ backgroundColor: `hsl(${channels.hue} 100% 50%)` }" @keydown="hueKeys" />
                </div>
              </motion.div>
            </div>
          </div>
          <div v-if="alpha" class="be-picker-slider be-picker-alpha-track"
            :style="{ background: `linear-gradient(to right, rgb(${rgb[0]} ${rgb[1]} ${rgb[2]} / 0), rgb(${rgb[0]} ${rgb[1]} ${rgb[2]})), repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px` }">
            <span class="be-picker-rail-ring" aria-hidden="true" />
            <div ref="alphaRail" class="be-picker-rail" @pointerdown="alphaDown" @pointermove="alphaMove" @pointerup="alphaUp" @pointercancel="alphaUp">
              <motion.div class="be-picker-thumb-plane" :style="{ x: alphaX.offset }">
                <div class="be-picker-thumb-zone">
                  <div class="be-picker-thumb be-picker-hue-thumb" role="slider" tabindex="0" aria-orientation="horizontal"
                    :aria-label="t.opacity" :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="Math.round(channels.alpha * 100)"
                    :aria-valuetext="t.opacityValue.replace('{value}', String(Math.round(channels.alpha * 100)))" :aria-disabled="disabled || undefined"
                    :style="{ backgroundColor: `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]} / ${channels.alpha})` }" @keydown="alphaKeys" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div class="be-picker-row be-picker-fields" :initial="itemAnimation(3).initial" :animate="itemAnimation(3).animate" :exit="PANEL_ITEM_EXIT" :transition="{ ...stagger, delay: PANEL_DELAY + PANEL_STAGGER * 2 }">
        <button type="button" class="be-picker-format" :aria-label="`${t.format}: ${format.toUpperCase()}`" :disabled="disabled"
          @click="format = FORMATS[(FORMATS.indexOf(format) + 1) % FORMATS.length]!">
          <Transition name="be-picker-format" mode="out-in">
            <span :key="format">{{ format.toUpperCase() }}</span>
          </Transition>
        </button>

        <div ref="fieldWrap" class="be-picker-hex-wrap">
          <template v-if="format === 'hex'">
            <span class="be-picker-hash" aria-hidden="true">#</span>
            <input class="be-picker-field be-picker-hex" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="9"
              :disabled="disabled" :aria-label="t.hex" :value="draft ?? hex.slice(1).toUpperCase()"
              @input="hexInput" @blur="settleHex" @keydown="hexKeys" />
          </template>
          <div v-else ref="channelFields" class="be-picker-channels">
            <label v-for="(value, index) in formatValues" :key="`${format}-${index}`" class="be-picker-channel">
              <input class="be-picker-field be-picker-channel-field" type="text" inputmode="numeric" autocomplete="off"
                :disabled="disabled" :aria-label="formatLabels[index]" :value="channelValue(index)"
                @input="channelInput(index, $event)" @blur="channelDraft !== null && commit(); channelDraft = null" @keydown="channelKeys(index, $event)" />
              <span aria-hidden="true" class="be-picker-channel-name">{{ format === 'rgb' ? ['R', 'G', 'B'][index] : ['H', 'S', 'L'][index] }}</span>
            </label>
          </div>
        </div>

        <span v-if="format === 'hex'" class="be-picker-swatch" aria-hidden="true">
          <span class="be-picker-swatch-fill" :style="{ backgroundColor: hex }" />
        </span>
      </motion.div>

      <motion.div v-if="presets.length" class="be-picker-presets" role="group" :aria-label="t.presets"
        :initial="itemAnimation(4).initial" :animate="itemAnimation(4).animate" :exit="PANEL_ITEM_EXIT" :transition="{ ...stagger, delay: PANEL_DELAY + PANEL_STAGGER * 3 }">
        <button v-for="preset in normalizedPresets" :key="preset.value" type="button" class="be-picker-preset"
          :aria-label="preset.label" :aria-pressed="preset.normalized === hex" :disabled="disabled"
          :while-press="reduce || disabled ? undefined : { scale: 0.88 }" :transition="pressSpring"
          @click="preset.parsed && (update(preset.parsed), commit())">
          <motion.span v-if="preset.normalized === hex" class="be-picker-preset-ring" aria-hidden="true"
            :layout-id="reduce ? undefined : presetId" :initial="false" :transition="PRESET_HOP" />
          <span class="be-picker-preset-swatch" aria-hidden="true">
            <span class="be-picker-preset-fill" :style="{ backgroundColor: preset.normalized }" />
          </span>
        </button>
      </motion.div>
    
      </motion.div>
    </AnimatePresence>
  </div>
</template>

<style scoped>
.be-picker { position: relative; align-self: flex-start; display: flex; width: 100%; min-width: 0; max-width: 18rem; flex-direction: column; gap: .75rem; }
.be-picker-trigger { display: inline-flex; width: fit-content; align-self: flex-start; box-sizing: border-box; height: 2.5rem; align-items: center; gap: .625rem; padding: 0 .875rem 0 .625rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-size: .875rem; outline: none; cursor: pointer; transition: border-color .18s; }
.be-picker-trigger:hover { border-color: color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.be-picker-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-picker-trigger:disabled { cursor: not-allowed; opacity: .5; }
.be-picker-socket { position: relative; width: 1.5rem; height: 1.5rem; flex: none; border: 1px dashed color-mix(in srgb, var(--beui-foreground) 20%, transparent); border-radius: .375rem; }
.be-picker-chip { position: absolute; inset: 0; overflow: hidden; border-radius: 6px; background: repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px; }
.be-picker-chip-fill { position: absolute; inset: 0; border-radius: 6px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
.be-picker-label { position: relative; display: inline-flex; overflow: hidden; font-family: var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.be-picker-label-text { position: relative; display: inline-flex; flex: none; white-space: nowrap; }
.be-picker-alpha { color: var(--beui-muted-foreground); }
.be-picker-alpha-enter-active, .be-picker-alpha-leave-active { transition: opacity .2s, transform .2s, filter .2s; }
.be-picker-alpha-enter-from, .be-picker-alpha-leave-to { opacity: 0; transform: translateX(-4px); filter: blur(3px); }
.be-picker-panel { position: absolute; top: 100%; left: 0; z-index: 50; box-sizing: border-box; display: flex; width: 18rem; margin-top: .5rem; flex-direction: column; gap: .75rem; padding: .75rem; }
.be-picker-surface { position: absolute; inset: 0; z-index: -1; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); box-shadow: 0 12px 32px -8px rgb(0 0 0 / .25); }
.be-picker-dissolve { pointer-events: none; position: absolute; inset: 0; border-radius: inherit; }
.be-picker-thumb-fade { position: absolute; inset: 0; }
.be-picker-area { position: relative; height: 10rem; width: 100%; border-radius: .75rem; cursor: crosshair; overflow: hidden; touch-action: none; }
.be-picker-area[data-disabled] { cursor: not-allowed; }
.be-picker-area:focus-visible { outline: 2px solid var(--beui-foreground); outline-offset: 2px; }
.be-picker-ring { pointer-events: none; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
.be-picker-thumb-plane { position: absolute; inset: 0; pointer-events: none; }
.be-picker-thumb-zone { position: absolute; left: 0; top: 0; width: 1.125rem; height: 1.125rem; transform: translate(-50%, -50%); }
.be-picker-area .be-picker-thumb-zone { left: 0; top: 0; }
.be-picker-thumb { display: block; width: 100%; height: 100%; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / .12), 0 2px 6px rgb(0 0 0 / .25); outline: none; }
.be-picker-thumb:focus-visible { outline: 2px solid var(--beui-foreground); outline-offset: 2px; }
.be-picker-loupe { pointer-events: none; position: absolute; bottom: calc(100% + 12px); left: 50%; z-index: 10; margin-left: -1.25rem; display: block; width: 2.5rem; height: 2.5rem; transform-origin: 50% 130%; }
.be-picker-loupe-square { position: absolute; inset: 0; overflow: hidden; border: 3px solid white; border-radius: 50% 50% 50% 0; box-shadow: 0 0 0 1px rgb(0 0 0 / .1), 0 6px 16px rgb(0 0 0 / .28); transform: rotate(-45deg); background: repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px; }
.be-picker-loupe-fill { position: absolute; inset: 0; }
.be-picker-loupe-enter-active, .be-picker-loupe-leave-active { transition: opacity .12s; }
.be-picker-loupe-enter-from, .be-picker-loupe-leave-to { opacity: 0; }
.be-picker-row { display: flex; align-items: center; gap: .75rem; }
.be-picker-eye { display: inline-flex; width: 2.25rem; height: 2.25rem; flex: none; align-items: center; justify-content: center; padding: 0; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); color: var(--beui-muted-foreground); outline: none; cursor: pointer; transition: color .15s; }
.be-picker-eye:hover { color: var(--beui-foreground); }
.be-picker-eye:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-picker-eye:disabled { cursor: not-allowed; }
.be-picker-eye svg { width: 1rem; height: 1rem; }
.be-picker-sliders { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: .75rem; }
.be-picker-slider { position: relative; height: .875rem; width: 100%; border-radius: 999px; touch-action: none; cursor: pointer; }
.be-picker-alpha-track { background-clip: padding-box; }
.be-picker-rail-ring { pointer-events: none; position: absolute; inset: 0; border-radius: 999px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
.be-picker-rail { position: absolute; inset-block: 0; left: 9px; right: 9px; }
.be-picker-rail .be-picker-thumb-zone { top: 50%; }
.be-picker-hue-thumb { cursor: pointer; }
.be-picker-fields { align-items: flex-start; gap: .375rem; }
.be-picker-format { display: inline-flex; box-sizing: border-box; height: 2.25rem; width: 3rem; flex: none; align-items: center; justify-content: center; padding: 0; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; font-weight: 500; outline: none; cursor: pointer; transition: color .15s; }
.be-picker-format:hover { color: var(--beui-foreground); }
.be-picker-format:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-picker-format-enter-active, .be-picker-format-leave-active { transition: opacity .15s, transform .15s; }
.be-picker-format-enter-from { opacity: 0; transform: translateY(10px); }
.be-picker-format-leave-to { opacity: 0; transform: translateY(-10px); }
.be-picker-hex-wrap { position: relative; display: flex; min-width: 0; flex: 1; }
.be-picker-hash { pointer-events: none; position: absolute; left: .75rem; top: 50%; transform: translateY(-50%); color: var(--beui-muted-foreground); font-size: .875rem; }
.be-picker-field { box-sizing: border-box; height: 2.25rem; width: 100%; min-width: 0; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-size: .875rem; font-variant-numeric: tabular-nums; outline: none; transition: border-color .15s, box-shadow .15s; }
.be-picker-field:focus-visible { border-color: color-mix(in srgb, var(--beui-foreground) 40%, transparent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-ring) 30%, transparent); }
.be-picker-field:disabled { cursor: not-allowed; opacity: .5; }
.be-picker-hex { padding: 0 .75rem 0 1.5rem; font-family: var(--font-mono, ui-monospace, monospace); text-transform: uppercase; }
.be-picker-channels { display: flex; min-width: 0; flex: 1; gap: .375rem; }
.be-picker-channel { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: center; gap: .25rem; }
.be-picker-channel-field { padding: 0 .25rem; text-align: center; }
.be-picker-channel-name { font-size: .6875rem; font-weight: 500; color: var(--beui-muted-foreground); }
.be-picker-swatch { position: relative; display: block; box-sizing: border-box; width: 2.25rem; height: 2.25rem; flex: none; overflow: hidden; border-radius: .5rem; background: repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px; }
.be-picker-swatch-fill { position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); transition: background-color .15s; }
.be-picker-presets { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: space-between; padding: .25rem .125rem 0; }
.be-picker-preset { position: relative; box-sizing: border-box; width: 1.5rem; height: 1.5rem; flex: none; padding: 0; border: 0; border-radius: 50%; background: none; outline: none; cursor: pointer; }
.be-picker-preset:focus-visible { outline: 2px solid var(--beui-foreground); outline-offset: 3px; }
.be-picker-preset:disabled { cursor: not-allowed; }
.be-picker-preset-ring { pointer-events: none; position: absolute; inset: -3px; border: 2px solid color-mix(in srgb, var(--beui-foreground) 70%, transparent); border-radius: 50%; }
.be-picker-preset-swatch { position: absolute; inset: 0; overflow: hidden; border-radius: 50%; background: repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px; }
.be-picker-preset-fill { position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
@media (prefers-reduced-motion: reduce) {
  .be-picker-alpha-enter-active, .be-picker-alpha-leave-active,
  .be-picker-format-enter-active, .be-picker-format-leave-active { transition: opacity .15s; }
  .be-picker-alpha-enter-from, .be-picker-alpha-leave-to,
  .be-picker-format-enter-from, .be-picker-format-leave-to { transform: none; filter: none; }
}
</style>

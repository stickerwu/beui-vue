<script setup lang="ts">
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, type VNode } from 'vue'
import { easeOut, layoutSpring, pressSpring } from '../core/motion'
import { capturePointer, releasePointer } from '../core/touch'
import { slideActionButtonMessages, type SlideActionButtonMessages } from './slide-action-messages'

const props = withDefaults(defineProps<{
  /** Track label; the slot wins when both are set. */
  label?: string
  disabled?: boolean
  completeLabel?: string
  /** Fraction of the track the thumb must reach to complete. */
  threshold?: number
  /** How long the completed state lasts before the thumb slides back, in ms. A negative value keeps it. */
  resetDelay?: number
  thumbClassName?: string
  fillClassName?: string
  className?: string
  /** Override any built-in string. */
  labels?: Partial<SlideActionButtonMessages>
}>(), { threshold: .82, resetDelay: 1200 })

const emit = defineEmits<{ complete: [] }>()
const slots = defineSlots<{
  /** Track label. A plain string also names the thumb for assistive technology. */
  default?: () => VNode[]
  /** Shown on the track once the slide completes; wins over the `completeLabel` prop. */
  completeLabel?: () => VNode[]
}>()

const reduce = useReducedMotion()
const text = computed(() => ({ ...slideActionButtonMessages, ...props.labels }))
// `<motion.button>` is a component, so its template ref is the component
// instance rather than the element; unwrap `$el` once and keep the node.
const trackRef = useTemplateRef<HTMLElement>('track')
const thumbRef = useTemplateRef<{ $el?: Element } | HTMLElement>('thumb')
const trackElement = computed(() => trackRef.value)
const thumbElement = computed<HTMLElement | null>(() => {
  const raw = thumbRef.value
  if (!raw) return null
  return ((raw as { $el?: HTMLElement }).$el ?? raw) as HTMLElement
})
const maxDistance = shallowRef(0)
const completed = shallowRef(false)
let completedOnce = false
let resetTimer: ReturnType<typeof setTimeout> | undefined
let dragging = false
let grabX = 0
let startX = 0

// One motion value drives the thumb; the fill, label fade and glyph morph are
// derived from it by hand so they stay exactly in step with the drag even as the
// measured track width changes under a resize.
const ICONS = [
  'M 8 5 L 15 12 L 8 19',
  'M 7 8 L 12 14 L 17 10',
  'M 5 12 L 10 17 L 19 7',
] as const
// The chevron folds into a check as the thumb travels: two segment paths,
// interpolated so the glyph morphs instead of swapping glyphs.
const x = useMotionValue(0)
// Progress (0-1 along the track) drives the fill, the label fade and the glyph
// morph through motion transforms, exactly like the upstream useTransform chain.
const progress = useMotionValue(0)
const labelOpacity = useTransform(progress, [0, .35, .65], [1, .75, 0])
const iconPath = useTransform(progress, [0, .5, 1], [...ICONS])

function sync(value: number) {
  const safe = Math.max(maxDistance.value, 1)
  progress.set(Math.min(1, Math.max(0, value / safe)))
}
useMotionValueEvent(x, 'change', sync)

function moveTo(target: number) {
  if (reduce.value) {
    x.set(target)
    return
  }
  animate(x, target, layoutSpring)
}

function reset() {
  completedOnce = false
  completed.value = false
  moveTo(0)
}

function complete() {
  if (props.disabled || completedOnce || maxDistance.value === 0) return
  completedOnce = true
  completed.value = true
  moveTo(maxDistance.value)
  emit('complete')
  clearTimeout(resetTimer)
  if (props.resetDelay >= 0) resetTimer = setTimeout(reset, props.resetDelay)
}

function pointerDown(event: PointerEvent) {
  if (props.disabled || completed.value || event.button !== 0) return
  dragging = true
  startX = event.clientX
  grabX = x.get()
  capturePointer(event.currentTarget as Element, event.pointerId)
}
function pointerMove(event: PointerEvent) {
  if (!dragging) return
  x.set(Math.max(0, Math.min(maxDistance.value, grabX + event.clientX - startX)))
}
function pointerUp(event: PointerEvent) {
  if (!dragging) return
  dragging = false
  releasePointer(event.currentTarget as Element, event.pointerId)
  if (x.get() >= maxDistance.value * props.threshold) complete()
  else moveTo(0)
}
function keyDown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  complete()
}

const accessibleName = computed(() => {
  const nodes = slots.default?.() ?? []
  const [first] = nodes
  if (nodes.length === 1 && typeof first?.children === 'string') return first.children
  return props.label ?? text.value.thumbLabel
})

let observer: ResizeObserver | undefined
function measure() {
  const track = trackElement.value
  const thumb = thumbElement.value
  if (!track || !thumb) return
  maxDistance.value = Math.max(track.clientWidth - thumb.clientWidth - 8, 0)
  sync(x.get())
}
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (trackElement.value) observer.observe(trackElement.value)
  if (thumbElement.value) observer.observe(thumbElement.value)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(resetTimer)
})
</script>

<template>
  <div ref="track" class="be-slide" :class="className">
    <motion.span aria-hidden="true" class="be-slide-fill" :class="fillClassName" :style="{ scaleX: progress }" />

    <motion.span aria-hidden="true" class="be-slide-label" :style="{ opacity: labelOpacity }">
      <slot>{{ label }}</slot>
    </motion.span>

    <motion.span
      aria-live="polite"
      class="be-slide-complete"
      :animate="{ opacity: completed ? 1 : 0 }"
      :transition="{ duration: reduce ? 0 : .15, ease: easeOut }"
    ><slot v-if="completed" name="completeLabel">{{ completeLabel ?? text.complete }}</slot></motion.span>

    <motion.button
      ref="thumb"
      type="button"
      :aria-label="accessibleName"
      :disabled="disabled"
      class="be-slide-thumb"
      :class="[thumbClassName, { 'is-complete': completed }]"
      :style="{ x }"
      :while-press="reduce || completed ? undefined : { scale: .94 }"
      :transition="pressSpring"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="pointerUp"
      @pointercancel="pointerUp"
      @keydown="keyDown"
    >
      <motion.svg viewBox="0 0 24 24" aria-hidden="true" class="be-slide-glyph">
        <motion.path
          :d="iconPath"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
        />
      </motion.svg>
    </motion.button>
  </div>
</template>

<style scoped>
.be-slide {
  position: relative; box-sizing: border-box; height: 4rem; width: 18rem; max-width: 100%;
  overflow: hidden; border-radius: 22px; padding: .25rem; background: var(--beui-muted);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--beui-primary) 10%, transparent);
  -webkit-touch-callout: none;
}
@media (pointer: coarse) { .be-slide { user-select: none; -webkit-user-select: none; } }
.be-slide-fill {
  position: absolute; inset: 0; transform-origin: left; will-change: transform;
  background: var(--beui-primary);
}
.be-slide-label {
  pointer-events: none; position: absolute; inset: 0; display: grid; place-items: center;
  padding-left: 2.5rem; color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; font-weight: 500;
}
.be-slide-complete {
  pointer-events: none; position: absolute; inset: 0; display: grid; place-items: center;
  color: var(--beui-primary-foreground, #fff); font-size: .875rem; line-height: 1.25rem; font-weight: 500;
}
.be-slide-thumb {
  position: relative; z-index: 10; display: grid; place-items: center; width: 3.5rem; height: 3.5rem;
  border: 0; border-radius: 18px; background: var(--beui-primary);
  color: var(--beui-primary-foreground, #fff); box-shadow: 0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1);
  cursor: grab; touch-action: none; outline: none;
  -webkit-touch-callout: none; user-select: none; -webkit-user-select: none;
}
.be-slide-thumb:active { cursor: grabbing; }
.be-slide-thumb:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-primary); }
.be-slide-thumb:disabled { pointer-events: none; opacity: .5; }
.be-slide-thumb.is-complete { cursor: default; background: var(--beui-background); color: var(--beui-foreground); }
.be-slide-glyph { width: 1.25rem; height: 1.25rem; pointer-events: none; outline: none; }
</style>

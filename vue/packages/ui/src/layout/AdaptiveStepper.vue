<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const adaptiveStepperMessages = {
  label: 'Quantity',
  summary: '{label}. Current value: {value}',
  decrease: 'Decrease value',
  increase: 'Increase value',
}
export type AdaptiveStepperMessages = typeof adaptiveStepperMessages
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, reactive, shallowRef, useId, watch } from 'vue'
import { easeOut, pressSpring } from '../core/motion'
import { cubicBezier, type LiquidBox, type LiquidTransition } from './liquid'

const props = withDefaults(defineProps<{
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  name?: string
  /** Formats the screen-reader value; the visible number stays plain. */
  formatValueText?: (value: number) => string
  /** Accessible name of the control. */
  label?: string
  labels?: Partial<AdaptiveStepperMessages>
}>(), { min: 0, max: 10, step: 1 })
const model = defineModel<number>({ default: 0 })
const emit = defineEmits<{ valueChange: [value: number] }>()
defineSlots<{ value?: (props: { value: number }) => unknown; decrement?: () => unknown; increment?: () => unknown }>()

const reduce = useReducedMotion()
const t = computed(() => ({ ...adaptiveStepperMessages, ...props.labels }))
const ariaLabel = computed(() => props.label ?? t.value.label)

const lower = computed(() => (Number.isFinite(props.min) ? props.min : 0))
const suppliedMax = computed(() => (Number.isFinite(props.max) ? props.max : lower.value))
const upper = computed(() => (suppliedMax.value > lower.value ? suppliedMax.value : lower.value))
const stride = computed(() => (Number.isFinite(props.step) && props.step > 0 ? props.step : 1))

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const cleanNumber = (value: number) => Number(value.toFixed(10))

const current = computed(() => clamp(Number.isFinite(model.value) ? model.value : lower.value, lower.value, upper.value))
const atMin = computed(() => current.value <= lower.value)
const atMax = computed(() => current.value >= upper.value)
const direction = shallowRef<-1 | 0 | 1>(0)
const valueText = computed(() => props.formatValueText?.(current.value) ?? String(current.value))
const summary = computed(() => t.value.summary.replace('{label}', ariaLabel.value).replace('{value}', valueText.value))
// A ref on a motion component is the component instance, not its node.
let decrementButton: HTMLButtonElement | null = null
let incrementButton: HTMLButtonElement | null = null
const buttonNode = (element: unknown) => {
  const node = element && typeof element === 'object' && '$el' in element ? (element as { $el: unknown }).$el : element
  return node instanceof HTMLButtonElement ? node : null
}
const setDecrementButton = (element: unknown) => { decrementButton = buttonNode(element) }
const setIncrementButton = (element: unknown) => { incrementButton = buttonNode(element) }

watch(current, (value, before) => { direction.value = value === before ? 0 : value > before ? 1 : -1 })

function nextStep(value: number, stepDirection: -1 | 1) {
  if (stepDirection === 1) {
    const nextIndex = Math.floor((value - lower.value) / stride.value + 1e-10) + 1
    return cleanNumber(Math.min(upper.value, lower.value + nextIndex * stride.value))
  }
  const previousIndex = Math.ceil((value - lower.value) / stride.value - 1e-10) - 1
  return cleanNumber(Math.max(lower.value, lower.value + previousIndex * stride.value))
}

function commit(nextValue: number, restoreFocus: boolean) {
  const next = clamp(cleanNumber(nextValue), lower.value, upper.value)
  if (next === current.value) return
  model.value = next
  emit('valueChange', next)
  if (!restoreFocus) return
  // The buttons swap or unmount at a bound, so focus the survivor once that
  // render has committed.
  requestAnimationFrame(() => {
    if (next === upper.value) decrementButton?.focus()
    else if (next === lower.value) incrementButton?.focus()
  })
}

function decrement(restoreFocus: boolean) {
  if (props.disabled || current.value <= lower.value) return
  commit(nextStep(current.value, -1), restoreFocus)
}
function increment(restoreFocus: boolean) {
  if (props.disabled || current.value >= upper.value) return
  commit(nextStep(current.value, 1), restoreFocus)
}

// --- Liquid geometry ------------------------------------------------------
// The deliberately elastic separation curve from the liquid email reference.
const STEPPER_LIQUID_TRANSITION: LiquidTransition = { duration: 600, ease: [0.22, 1.3, 0.71, 1] }
type Part = 'decrement' | 'value' | 'increment'
const parts: readonly Part[] = ['decrement', 'value', 'increment']

// Each step re-splits the track: the value grows or shrinks, the buttons slide
// to their slots, and the goo filter keeps the three rects reading as one body.
const target = computed<Record<Part, LiquidBox>>(() => {
  const slot = atMin.value && atMax.value
    ? { x: 0, width: 216 }
    : atMin.value ? { x: 0, width: 152 }
      : atMax.value ? { x: 64, width: 152 }
        : { x: 64, width: 88 }
  return {
    decrement: { x: atMin.value ? 32 : 0, y: 0, width: 48, height: 48, radius: 24 },
    value: { x: slot.x, y: 0, width: slot.width, height: 48, radius: 24 },
    increment: { x: atMax.value ? 136 : 168, y: 0, width: 48, height: 48, radius: 24 },
  }
})
const boxes = reactive<Record<Part, LiquidBox>>({
  decrement: { x: 32, y: 0, width: 48, height: 48, radius: 24 },
  value: { x: 0, y: 0, width: 216, height: 48, radius: 24 },
  increment: { x: 168, y: 0, width: 48, height: 48, radius: 24 },
})
for (const part of parts) Object.assign(boxes[part], target.value[part])

let frame = 0
watch(target, next => {
  cancelAnimationFrame(frame)
  const duration = reduce.value ? 0 : STEPPER_LIQUID_TRANSITION.duration!
  if (!duration) {
    for (const part of parts) Object.assign(boxes[part], next[part])
    return
  }
  const from = Object.fromEntries(parts.map(part => [part, { ...boxes[part] }])) as Record<Part, LiquidBox>
  const ease = cubicBezier(STEPPER_LIQUID_TRANSITION.ease!)
  const started = performance.now()
  const tick = (now: number) => {
    const progress = Math.min(1, (now - started) / duration)
    const eased = ease(progress)
    for (const part of parts) {
      const a = from[part]
      const b = next[part]
      boxes[part] = {
        x: a.x + (b.x - a.x) * eased,
        y: a.y + (b.y - a.y) * eased,
        width: a.width + (b.width - a.width) * eased,
        height: a.height + (b.height - a.height) * eased,
        radius: a.radius + (b.radius - a.radius) * eased,
      }
    }
    if (progress < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}, { flush: 'sync' })
onBeforeUnmount(() => cancelAnimationFrame(frame))

// The goo: a blur, a hard alpha threshold, then the solid shape with a 1px
// inset edge drawn over it so the surface keeps a border.
const filterId = `be-stepper-goo-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const GOO_BLUR = 8
const GOO_CONTRAST = 22
const GOO_INTERCEPT = Math.round((0.5 - GOO_CONTRAST * (5 / 12)) * 100) / 100
const GOO_PADDING = Math.ceil(GOO_BLUR * 3 + 24)
const roll = computed(() => (reduce.value ? 0 : direction.value * 32))
</script>

<template>
  <fieldset class="be-stepper" :disabled="disabled">
    <legend class="be-stepper-legend">{{ summary }}</legend>
    <svg aria-hidden="true" focusable="false" class="be-stepper-goo">
      <defs>
        <filter :id="filterId" :x="-GOO_PADDING" :y="-GOO_PADDING" width="312" height="144" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feGaussianBlur in="SourceGraphic" :stdDeviation="GOO_BLUR" result="blur" />
          <feColorMatrix in="blur" type="matrix" :values="`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${GOO_CONTRAST} ${GOO_INTERCEPT}`" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" result="shape" />
          <feColorMatrix in="shape" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 -29.5" result="solid-shape" />
          <feMorphology in="solid-shape" operator="erode" radius="1" result="inset-shape" />
          <feComposite in="solid-shape" in2="inset-shape" operator="out" result="edge-mask" />
          <feFlood style="flood-color: var(--beui-foreground); flood-opacity: .08" result="edge-color" />
          <feComposite in="edge-color" in2="edge-mask" operator="in" result="edge" />
          <feMerge><feMergeNode in="shape" /><feMergeNode in="edge" /></feMerge>
        </filter>
      </defs>
      <g :filter="`url(#${filterId})`" style="fill: var(--beui-background)">
        <rect v-for="part in parts" :key="part" x="0" y="0" :width="boxes[part].width" :height="boxes[part].height" :rx="boxes[part].radius"
          :style="{ transform: `translate(${boxes[part].x}px, ${boxes[part].y}px)`, transformBox: 'fill-box', transformOrigin: 'center', willChange: 'transform' }" />
      </g>
    </svg>

    <input v-if="name" type="hidden" :name="name" :value="current" />

    <div class="be-stepper-item" :class="{ 'be-stepper-hidden': atMin }"
      :style="{ transform: `translate(${boxes.decrement.x}px, ${boxes.decrement.y}px)`, width: `${boxes.decrement.width}px`, height: `${boxes.decrement.height}px` }">
      <motion.button :ref="setDecrementButton" type="button" :aria-label="labels?.decrease ?? t.decrease" :aria-hidden="atMin || undefined"
        :tabindex="atMin ? -1 : undefined" :disabled="disabled || atMin"
        :while-press="reduce || disabled || atMin ? undefined : { scale: 0.94 }" :transition="reduce ? { duration: 0 } : pressSpring"
        class="be-stepper-action" :class="{ 'be-stepper-dim': disabled }" @click="decrement($event.detail === 0)">
        <motion.span aria-hidden="true" :initial="false" :animate="{ opacity: atMin ? 0 : 1, filter: atMin ? 'blur(2px)' : 'blur(0px)' }"
          :transition="{ duration: reduce ? 0 : 0.15, ease: easeOut }">
          <slot name="decrement"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" /></svg></slot>
        </motion.span>
      </motion.button>
    </div>

    <div class="be-stepper-item" :style="{ transform: `translate(${boxes.value.x}px, ${boxes.value.y}px)`, width: `${boxes.value.width}px`, height: `${boxes.value.height}px` }">
      <motion.output aria-live="polite" aria-atomic="true" class="be-stepper-value">
        <span class="be-stepper-sr">{{ valueText }}</span>
        <span aria-hidden="true" class="be-stepper-roll">
          <AnimatePresence :initial="false" mode="popLayout">
            <motion.span :key="current" class="be-stepper-digit"
              :initial="{ opacity: reduce ? 1 : 0.35, filter: reduce ? 'blur(0px)' : 'blur(2px)', transform: `translateY(${roll}%)` }"
              :animate="{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(0%)' }"
              :exit="{ opacity: reduce ? 1 : 0, filter: reduce ? 'blur(0px)' : 'blur(2px)', transform: `translateY(${-roll}%)`, transition: { duration: reduce ? 0 : 0.12, ease: easeOut } }"
              :transition="{ duration: reduce ? 0 : 0.18, ease: easeOut }">
              <slot name="value" :value="current">{{ current }}</slot>
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.output>
    </div>

    <div class="be-stepper-item" :class="{ 'be-stepper-hidden': atMax }"
      :style="{ transform: `translate(${boxes.increment.x}px, ${boxes.increment.y}px)`, width: `${boxes.increment.width}px`, height: `${boxes.increment.height}px` }">
      <motion.button :ref="setIncrementButton" type="button" :aria-label="labels?.increase ?? t.increase" :aria-hidden="atMax || undefined"
        :tabindex="atMax ? -1 : undefined" :disabled="disabled || atMax"
        :while-press="reduce || disabled || atMax ? undefined : { scale: 0.94 }" :transition="reduce ? { duration: 0 } : pressSpring"
        class="be-stepper-action" :class="{ 'be-stepper-dim': disabled }" @click="increment($event.detail === 0)">
        <motion.span aria-hidden="true" :initial="false" :animate="{ opacity: atMax ? 0 : 1, filter: atMax ? 'blur(2px)' : 'blur(0px)' }"
          :transition="{ duration: reduce ? 0 : 0.15, ease: easeOut }">
          <slot name="increment"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" /></svg></slot>
        </motion.span>
      </motion.button>
    </div>
  </fieldset>
</template>

<style scoped>
.be-stepper { position: relative; isolation: isolate; display: inline-block; box-sizing: border-box; width: 216px; height: 48px; margin: 0; padding: 0; border: 0; }
.be-stepper-legend { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.be-stepper-goo { pointer-events: none; position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; overflow: visible; }
.be-stepper-item { position: absolute; left: 0; top: 0; z-index: 1; }
.be-stepper-hidden { pointer-events: none; }
.be-stepper-action { box-sizing: border-box; display: grid; width: 100%; height: 100%; place-items: center; padding: 0; border: 1px solid transparent; border-radius: 999px; background: transparent; background-clip: padding-box; color: var(--beui-foreground); outline: none; cursor: pointer; transition: background-color .18s; }
.be-stepper-action:hover { background: var(--beui-muted); }
.be-stepper-hidden .be-stepper-action:hover { background: transparent; }
.be-stepper-action:disabled { pointer-events: none; }
.be-stepper-dim { opacity: .5; }
.be-stepper-action:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-stepper-action span { display: block; width: 1.25rem; height: 1.25rem; }
.be-stepper-action :deep(svg) { display: block; width: 1.25rem; height: 1.25rem; }
.be-stepper-value { display: flex; box-sizing: border-box; width: 100%; height: 100%; min-width: 0; align-items: center; justify-content: center; overflow: hidden; padding: 0 1rem; border: 1px solid transparent; border-radius: 999px; background: transparent; background-clip: padding-box; color: var(--beui-foreground); font-weight: 600; font-size: 1.125rem; line-height: 1; font-variant-numeric: tabular-nums; }
.be-stepper-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.be-stepper-roll { position: relative; display: grid; min-height: 1.1em; min-width: 1ch; place-items: center; overflow: hidden; line-height: 1; }
.be-stepper-digit { grid-row: 1; grid-column: 1; will-change: transform, filter, opacity; }
</style>

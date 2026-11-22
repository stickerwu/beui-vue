<script lang="ts">
export { adaptiveStepperMessages, type AdaptiveStepperMessages } from './adaptive-stepper/context'
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, shallowRef, useId, useTemplateRef } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import AdaptiveStepperDecrement from './AdaptiveStepperDecrement.vue'
import AdaptiveStepperIncrement from './AdaptiveStepperIncrement.vue'
import AdaptiveStepperValue from './AdaptiveStepperValue.vue'
import {
  adaptiveStepperKey,
  adaptiveStepperMessages,
  type AdaptiveStepperContext,
  type AdaptiveStepperMessages,
  type StepDirection,
} from './adaptive-stepper/context'
import type { LiquidBox } from './liquid'
import { reactive, watch } from 'vue'

const props = withDefaults(defineProps<{
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  name?: string
  /** Formats the screen-reader value; the visible number stays plain. */
  formatValueText?: (value: number) => string
  /** Accessible name of the control. */
  'aria-label'?: string
  /** Alias of `aria-label`. */
  label?: string
  /** Override any built-in string. `{label}` and `{value}` fill `summary`. */
  labels?: Partial<AdaptiveStepperMessages>
}>(), { defaultValue: 0, min: 0, max: 10, step: 1, disabled: false })
/** Controlled value. Leave it unbound for an uncontrolled stepper that starts at `defaultValue`. */
const model = defineModel<number>()
const emit = defineEmits<{ valueChange: [value: number] }>()
defineSlots<{
  /** The three parts: `AdaptiveStepperDecrement`, `AdaptiveStepperValue` and `AdaptiveStepperIncrement`. Omit it for the default layout. */
  default?: () => unknown
  /** Custom display of the value in the default layout. */
  value?: (props: { value: number }) => unknown
  /** Icon of the decrement button in the default layout. */
  decrement?: () => unknown
  /** Icon of the increment button in the default layout. */
  increment?: () => unknown
}>()

const reduce = useReducedMotion()
const t = computed(() => ({ ...adaptiveStepperMessages, ...props.labels }))
const ariaLabel = computed(() => props['aria-label'] ?? props.label ?? t.value.label)

const lower = computed(() => (Number.isFinite(props.min) ? props.min : 0))
const suppliedMax = computed(() => (Number.isFinite(props.max) ? props.max : lower.value))
const upper = computed(() => (suppliedMax.value > lower.value ? suppliedMax.value : lower.value))
const stride = computed(() => (Number.isFinite(props.step) && props.step > 0 ? props.step : 1))

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const cleanNumber = (value: number) => Number(value.toFixed(10))

// An unbound `v-model` keeps its own state (Vue's local model), so the first
// value is the clamped `defaultValue` until the user steps.
const supplied = computed(() => model.value ?? clamp(Number.isFinite(props.defaultValue) ? props.defaultValue : lower.value, lower.value, upper.value))
const current = computed(() => clamp(Number.isFinite(supplied.value) ? supplied.value : lower.value, lower.value, upper.value))
const atMin = computed(() => current.value <= lower.value)
const atMax = computed(() => current.value >= upper.value)
const direction = shallowRef<StepDirection>(0)
const valueText = computed(() => props.formatValueText?.(current.value) ?? String(current.value))
const summary = computed(() => t.value.summary.replace('{label}', ariaLabel.value).replace('{value}', valueText.value))
const decrementButton = shallowRef<HTMLButtonElement | null>(null)
const incrementButton = shallowRef<HTMLButtonElement | null>(null)

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
  // The button swaps out at a bound, so focus the survivor once that render has committed.
  requestAnimationFrame(() => {
    if (next === upper.value && current.value === upper.value) decrementButton.value?.focus()
    else if (next === lower.value && current.value === lower.value) incrementButton.value?.focus()
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

const blobs = reactive<Record<string, LiquidBox>>({})
provide(adaptiveStepperKey, {
  value: current,
  valueText,
  direction,
  atMin,
  atMax,
  disabled: computed(() => props.disabled),
  reduce,
  t,
  decrement,
  increment,
  decrementButton,
  incrementButton,
  blobs,
} satisfies AdaptiveStepperContext)

// --- Goo ------------------------------------------------------------------
// The goo: a blur, a hard alpha threshold, then the solid shape with a 1px
// inset edge drawn over it so the surface keeps a border.
const filterId = `liquid-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const GOO_BLUR = 8
const GOO_CONTRAST = 22
const GOO_INTERCEPT = Math.round((0.5 - GOO_CONTRAST * (5 / 12)) * 100) / 100
const GOO_PADDING = Math.ceil(GOO_BLUR * 3 + 24)
const liquid = useTemplateRef<HTMLElement>('liquid')
const size = shallowRef({ width: 216, height: 48 })
let observer: ResizeObserver | undefined
onMounted(() => {
  const root = liquid.value
  if (!root) return
  const measure = () => {
    const next = { width: root.offsetWidth, height: root.offsetHeight }
    if (next.width !== size.value.width || next.height !== size.value.height) size.value = next
  }
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(root)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <fieldset class="be-stepper" :disabled="disabled">
    <legend class="be-stepper-legend">{{ summary }}</legend>
    <div ref="liquid" class="be-stepper-liquid">
      <svg aria-hidden="true" focusable="false" class="be-stepper-goo">
        <defs>
          <filter :id="filterId" :x="-GOO_PADDING" :y="-GOO_PADDING" :width="size.width + GOO_PADDING * 2" :height="size.height + GOO_PADDING * 2" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
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
          <rect
            v-for="(box, id) in blobs"
            :key="id"
            x="0"
            y="0"
            :width="box.width"
            :height="box.height"
            :rx="box.radius"
            :style="{ transform: `translate(${box.x}px, ${box.y}px)`, transformBox: 'fill-box', transformOrigin: 'center', willChange: 'transform' }"
          />
        </g>
      </svg>
      <slot>
        <AdaptiveStepperDecrement><slot name="decrement" /></AdaptiveStepperDecrement>
        <AdaptiveStepperValue><template #default="{ value }"><slot name="value" :value="value">{{ value }}</slot></template></AdaptiveStepperValue>
        <AdaptiveStepperIncrement><slot name="increment" /></AdaptiveStepperIncrement>
      </slot>
    </div>
    <input v-if="name" type="hidden" :name="name" :value="current" />
  </fieldset>
</template>

<style scoped>
.be-stepper { position: relative; isolation: isolate; display: inline-block; box-sizing: border-box; width: 13.5rem; height: 3rem; margin: 0; padding: 0; border: 0; }
.be-stepper-legend { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border-width: 0; }
.be-stepper-liquid { position: relative; isolation: isolate; width: 100%; height: 100%; }
.be-stepper-goo { pointer-events: none; position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; overflow: visible; }
</style>

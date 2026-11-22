<script setup lang="ts">
import { animate, motion, useMotionValue, useMotionValueEvent } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, watch } from 'vue'
import { type SliderBaseProps } from './types'
import { snapSliderValue, useSlider } from './use-slider'

// Settle spring for the snap after a flick — quick, no overshoot past the tick.
const SPRING_SNAP = { type: 'spring', stiffness: 500, damping: 40, mass: 0.6 } as const

/**
 * Ruler slider: the scale scrolls under a fixed needle instead of a handle
 * moving along a track. Flicks carry momentum and settle onto the nearest tick.
 */
const props = withDefaults(defineProps<SliderBaseProps & {
  /** Pixels between two steps. */
  gap?: number
  /** Label every Nth step; those ticks are drawn tall. */
  majorEvery?: number
  /** Unit shown next to the value. */
  unit?: string
}>(), { gap: 14, majorEvery: 5 })
const emit = defineEmits<{ 'update:modelValue': [value: number], valueChange: [value: number] }>()
const reduce = useReducedMotion()
// Decimal places the step implies, so 0.5 reads "72.5" and 1 reads "72". Fixed
// width keeps the readout from jittering as the value rolls; tick labels stay
// trimmed so a whole-number scale is not littered with ".0".
const decimals = computed(() => String(props.step ?? 1).split('.')[1]?.length ?? 0)
const readout = (value: number) => value.toFixed(decimals.value)

const { sliderRef, current, min, max, step, commit, aria, onKeyDown } = useSlider(props, value => {
  emit('update:modelValue', value)
  emit('valueChange', value)
}, {
  // "72.5 kg" beats a bare "72.5" for a screen reader — but a caller who
  // formats the announcement itself outranks the unit.
  formatValueText: value => (props.unit ? `${readout(value)} ${props.unit}` : undefined),
})

// The range need not divide by the step (0–10 by 4). Full ticks stop at the
// last whole one and max gets a tick of its own, so the scale never runs past
// the value the slider can actually report.
const span = computed(() => Number(((max.value - min.value) / step.value).toFixed(6)))
const maxOffset = computed(() => span.value * props.gap)
const x = useMotionValue(-((current.value - min.value) / step.value) * props.gap)
// While the pointer drives the strip (or its momentum still runs), x owns the
// value; outside of that the value owns x.
let interacting = false
// True only while the pointer is down. It keeps a cancelled momentum's
// transition end from snapping underneath a fresh grab.
let holding = false
// A new gesture or key press bumps this, so a snap that resolves late cannot
// clear interacting underneath an active drag.
let gesture = 0

// Every tick is in the DOM — fine to a few hundred (80 units at step 0.5 is
// 161). Each tick carries an offset because max sits `remainder` of a step past
// the last whole tick.
const ticks = computed(() => {
  const whole = Math.floor(span.value)
  const list = Array.from({ length: whole + 1 }, (_, index) => ({
    // toFixed trims float dust from fractional steps (0.1 + 0.2 …).
    value: Number((min.value + index * step.value).toFixed(6)),
    major: index % props.majorEvery === 0,
    offset: index * props.gap,
  }))
  if (span.value - whole > 0) list.push({ value: max.value, major: true, offset: maxOffset.value })
  return list
})

function snapToTick() {
  // The same nearest-tick rule useSlider applies. max counts as a candidate when
  // the step does not divide the range.
  const target = snapSliderValue(min.value + (-x.get() / props.gap) * step.value, min.value, max.value, step.value)
  const snapped = -((target - min.value) / step.value) * props.gap
  const id = ++gesture
  if (reduce.value) {
    x.set(snapped)
    interacting = false
    return
  }
  animate(x, snapped, SPRING_SNAP).then(() => {
    if (gesture === id) interacting = false
  })
}

// A key press takes the scale back from momentum: without this the coasting
// strip keeps committing its own value and swallows the keyboard input.
function keyDown(event: KeyboardEvent) {
  x.stop()
  gesture++
  interacting = false
  holding = false
  onKeyDown(event)
}

watch([current, min, step, () => props.gap], () => {
  if (interacting) return
  x.set(-((current.value - min.value) / step.value) * props.gap)
}, { flush: 'post' })

useMotionValueEvent(x, 'change', value => {
  if (!interacting) return
  commit(min.value + (-value / props.gap) * step.value)
})

function dragStart() {
  gesture++
  interacting = true
  holding = true
}
// Momentum end when there is momentum, drag end when there is not.
function dragTransitionEnd() {
  if (!holding) snapToTick()
}
function dragEnd() {
  holding = false
  if (reduce.value) snapToTick()
}
</script>

<template>
  <div ref="sliderRef" v-bind="aria" class="be-ruler" :class="{ 'be-ruler-disabled': disabled }" @keydown="keyDown">
    <div class="be-ruler-readout">
      <span class="be-ruler-value">{{ readout(current) }}</span>
      <span v-if="unit" class="be-ruler-unit">{{ unit }}</span>
    </div>

    <!-- masked, not overlaid with background-coloured gradients — the fade has
         to work on any surface the slider is dropped onto -->
    <div class="be-ruler-window">
      <!-- strip — dragged directly, so momentum comes from the drag gesture.
           The ticks are positioned rather than laid out, so the row needs an
           explicit width plus half a gap of slop each side to cover the whole
           drag surface. -->
      <motion.div
        class="be-ruler-strip"
        :drag="disabled ? false : 'x'"
        :drag-constraints="{ left: -maxOffset, right: 0 }"
        :drag-elastic="0.03"
        :drag-momentum="!reduce"
        :drag-transition="{ power: 0.22, timeConstant: 320 }"
        :style="{ x, marginLeft: `${-gap / 2}px`, width: `${maxOffset + gap}px` }"
        @drag-start="dragStart"
        @drag-transition-end="dragTransitionEnd"
        @drag-end="dragEnd"
      >
        <!-- pb reserves the label row, so minor ticks need no spacer node -->
        <span v-for="tick in ticks" :key="tick.value" class="be-ruler-tick" :style="{ left: `${tick.offset + gap / 2}px` }">
          <span class="be-ruler-mark" :class="tick.major ? 'be-ruler-major' : 'be-ruler-minor'" />
          <span v-if="tick.major" class="be-ruler-label">{{ tick.value }}</span>
        </span>
      </motion.div>

      <!-- needle — the read head the scale moves under -->
      <div class="be-ruler-needle"><span /></div>
    </div>
  </div>
</template>

<style scoped>
.be-ruler {
  position: relative; box-sizing: border-box; width: 100%; overflow: hidden; border-radius: 1rem; outline: none; color: var(--beui-foreground);
  touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: grab;
}
.be-ruler:active { cursor: grabbing; }
.be-ruler:focus-visible { box-shadow: 0 0 0 4px color-mix(in srgb, var(--beui-foreground) 30%, transparent); }
.be-ruler-disabled { pointer-events: none; opacity: .5; }
.be-ruler-readout { pointer-events: none; display: flex; align-items: baseline; justify-content: center; gap: .25rem; padding: .25rem 0 .75rem; }
.be-ruler-value { font-size: 1.875rem; line-height: 2.25rem; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--beui-foreground); }
.be-ruler-unit { font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.be-ruler-window { position: relative; height: 3rem; mask-image: linear-gradient(to right, transparent, black 18%, black 82%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 18%, black 82%, transparent); }
.be-ruler-strip { position: absolute; top: 0; bottom: 0; left: 50%; }
.be-ruler-tick { position: absolute; bottom: 0; display: flex; flex-direction: column; align-items: center; padding-bottom: 18px; transform: translateX(-50%); }
.be-ruler-mark { display: block; width: 1px; border-radius: 999px; }
/* minor ticks at /45 clear the 3:1 non-text floor in both themes */
.be-ruler-major { height: 1.75rem; background: color-mix(in srgb, var(--beui-foreground) 70%, transparent); }
.be-ruler-minor { height: .875rem; background: color-mix(in srgb, var(--beui-foreground) 45%, transparent); }
.be-ruler-label { position: absolute; bottom: 0; font-size: 10px; line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.be-ruler-needle { pointer-events: none; position: absolute; bottom: 1.25rem; left: 50%; transform: translateX(-50%); }
.be-ruler-needle span { display: block; width: 3px; height: 2.25rem; border-radius: 999px; background: var(--beui-foreground); }
</style>

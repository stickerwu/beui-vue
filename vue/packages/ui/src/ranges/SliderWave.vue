<script setup lang="ts">
import { motion } from 'motion-v'
import { computed } from 'vue'
import { type SliderBaseProps } from './types'
import { useSlider } from './use-slider'
import { useReducedMotion } from '../core/reduced-motion'

// Per-bar spring: soft enough that the crest wobbles as it travels.
const SPRING_BAR = { type: 'spring', stiffness: 420, damping: 20, mass: 0.5 } as const
/** Width of the crest in bars — bigger spreads the bell wider. */
const SPREAD = 2.6

/**
 * Equalizer slider: bars rise into a crest around the handle position and fall
 * back as it passes, so the value reads as a travelling wave. Bars up to the
 * value are filled, the rest stay muted.
 */
const props = withDefaults(defineProps<SliderBaseProps & {
  /** Number of bars drawn across the track. */
  bars?: number
}>(), { bars: 32 })
const emit = defineEmits<{ 'update:modelValue': [value: number], valueChange: [value: number] }>()
const reduce = useReducedMotion()
const { sliderRef, percent, dragging, trackEvents, aria, onKeyDown } = useSlider(props, value => {
  emit('update:modelValue', value)
  emit('valueChange', value)
})

const lanes = computed(() => {
  const head = (percent.value / 100) * (props.bars - 1)
  return Array.from({ length: props.bars }, (_, index) => {
    const distance = Math.abs(index - head)
    return {
      key: index,
      distance,
      // Gaussian crest centred on the handle.
      crest: Math.exp(-(distance ** 2) / (2 * SPREAD ** 2)),
      filled: index <= Math.round(head),
    }
  })
})
const scaleFor = (crest: number) => (reduce.value ? 0.4 : 0.22 + crest * (dragging.value ? 0.78 : 0.6))
const transitionFor = (distance: number) => (reduce.value ? { duration: 0 } : { ...SPRING_BAR, delay: Math.min(distance * 0.012, 0.12) })
</script>

<template>
  <div class="be-wave" :class="{ 'be-wave-disabled': disabled }" v-bind="trackEvents">
    <motion.span
      v-for="lane in lanes"
      :key="lane.key"
      class="be-wave-bar"
      :class="lane.filled ? 'be-wave-filled' : 'be-wave-muted'"
      :animate="{ scaleY: scaleFor(lane.crest) }"
      :transition="transitionFor(lane.distance)"
    />
    <button ref="sliderRef" type="button" v-bind="aria" class="be-wave-button" @keydown="onKeyDown" />
  </div>
</template>

<style scoped>
.be-wave {
  position: relative; display: flex; box-sizing: border-box; width: 100%; height: 5rem; align-items: center; justify-content: space-between; gap: .25rem;
  touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: grab; color: var(--beui-foreground);
}
.be-wave:active { cursor: grabbing; }
.be-wave-disabled { pointer-events: none; opacity: .5; }
.be-wave-bar { display: block; height: 3.5rem; flex: 1 1 0%; transform-origin: center; border-radius: 999px; }
.be-wave-filled { background: var(--beui-foreground); }
/* /45 keeps the unfilled track above the 3:1 non-text contrast floor in both themes. */
.be-wave-muted { background: color-mix(in srgb, var(--beui-foreground) 45%, transparent); }
.be-wave-button { position: absolute; inset: 0; box-sizing: border-box; margin: 0; padding: 0; border: 0; border-radius: .75rem; background: none; outline: none; touch-action: none; }
.be-wave-button:focus-visible { box-shadow: 0 0 0 4px color-mix(in srgb, var(--beui-foreground) 30%, transparent); }
</style>

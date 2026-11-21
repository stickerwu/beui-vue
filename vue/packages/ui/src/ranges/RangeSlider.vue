<script setup lang="ts">
import { computed } from 'vue'
import SliderBubble from './SliderBubble.vue'
import SliderFluid from './SliderFluid.vue'
import SliderInline from './SliderInline.vue'
import SliderRuler from './SliderRuler.vue'
import SliderStandard from './SliderStandard.vue'
import SliderWave from './SliderWave.vue'
import type { RangeProps } from './types'

/** One slider, six designs. `variant` picks the design; each is a port of the
 * matching React slider (range-slider, -inline, -fluid, -wave, -bubble, -ruler). */
const props = withDefaults(defineProps<RangeProps>(), {
  variant: 'standard', min: 0, max: 100, step: 1, defaultValue: 0,
  bars: 32, gap: 14, majorEvery: 5, showTicks: true,
})
const emit = defineEmits<{ 'update:modelValue': [value: number], valueChange: [value: number] }>()

const base = computed(() => ({
  modelValue: props.modelValue, defaultValue: props.defaultValue, min: props.min, max: props.max, step: props.step,
  disabled: props.disabled, ariaLabel: props.ariaLabel, label: props.label, formatValueText: props.formatValueText,
}))
const design = computed(() => {
  switch (props.variant) {
    case 'fluid': return { is: SliderFluid, own: { format: props.format } }
    case 'inline': return { is: SliderInline, own: { format: props.format, showTicks: props.showTicks } }
    case 'wave': return { is: SliderWave, own: { bars: props.bars } }
    case 'bubble': return { is: SliderBubble, own: { format: props.format } }
    case 'ruler': return { is: SliderRuler, own: { gap: props.gap, majorEvery: props.majorEvery, unit: props.unit } }
    default: return { is: SliderStandard, own: { showTicks: props.showTicks } }
  }
})
</script>

<template>
  <component
    :is="design.is"
    v-bind="{ ...base, ...design.own }"
    @update:model-value="emit('update:modelValue', $event)"
    @value-change="emit('valueChange', $event)"
  />
</template>

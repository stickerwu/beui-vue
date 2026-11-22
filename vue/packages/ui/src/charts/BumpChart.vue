<script setup lang="ts">
import BumpChartLegend from './BumpChartLegend.vue'
import BumpChartPlot from './BumpChartPlot.vue'
import { provideBumpChart, useBumpChartModel, type BumpChartEmit, type BumpChartProps } from './bump-context'

defineSlots<{
  /** Compose `BumpChartPlot` and `BumpChartLegend`; omit it for the complete chart. */
  default?(): unknown
}>()
const props = defineProps<BumpChartProps>()
const emit = defineEmits<{ 'update:active': [value: string | null]; activeChange: [value: string | null] }>()
const model = useBumpChartModel(props, emit as BumpChartEmit)
provideBumpChart(model)
const { label } = model
</script>

<template>
  <section class="bump" data-slot="bump-chart" :aria-label="label">
    <slot>
      <BumpChartPlot />
      <BumpChartLegend />
    </slot>
  </section>
</template>

<style scoped>
.bump { display: flex; flex-direction: column; gap: 20px; width: 100%; }
</style>

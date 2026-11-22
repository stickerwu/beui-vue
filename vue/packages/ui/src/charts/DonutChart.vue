<script setup lang="ts">
import DonutChartCenter from './DonutChartCenter.vue'
import DonutChartLegend from './DonutChartLegend.vue'
import DonutChartPlot from './DonutChartPlot.vue'
import { provideDonutChart, useDonutModel, type DonutChartEmit, type DonutChartProps } from './donut-context'

defineSlots<{
  /**
   * Compose `DonutChartPlot` and `DonutChartLegend`; omit it for the complete chart.
   *
   * ```vue
   * <DonutChart :segments="segments" :format-value="usd">
   *   <DonutChartPlot><DonutChartCenter total-label="Monthly revenue" /></DonutChartPlot>
   *   <DonutChartLegend />
   * </DonutChart>
   * ```
   */
  default?(): unknown
}>()
const props = defineProps<DonutChartProps>()
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null]; select: [id: string] }>()
provideDonutChart(useDonutModel(props, emit as DonutChartEmit))
</script>

<template>
  <div class="donut-chart" data-slot="donut-chart">
    <slot>
      <div class="layout">
        <DonutChartPlot><DonutChartCenter /></DonutChartPlot>
        <DonutChartLegend />
      </div>
    </slot>
  </div>
</template>

<style scoped>
.donut-chart { width: 100%; }
.layout { display: grid; align-items: center; gap: 24px; }
@media (min-width: 640px) { .layout { grid-template-columns: minmax(0, 16rem) minmax(0, 1fr); } }
</style>

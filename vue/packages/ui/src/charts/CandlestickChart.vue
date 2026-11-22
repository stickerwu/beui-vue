<script setup lang="ts">
import CandlestickChartLegend from './CandlestickChartLegend.vue'
import CandlestickChartPlot from './CandlestickChartPlot.vue'
import { provideCandlestickChart, useCandlestickModel, type CandlestickChartEmit, type CandlestickChartProps } from './candlestick-context'

defineSlots<{
  /**
   * Compose `CandlestickChartLegend` and `CandlestickChartPlot`; omit it for the complete chart.
   *
   * ```vue
   * <CandlestickChart :candles="candles" :last-price="last" :format-price="usd">
   *   <CandlestickChartLegend />
   *   <CandlestickChartPlot :height="360" />
   * </CandlestickChart>
   * ```
   */
  default?(): unknown
}>()
const props = defineProps<CandlestickChartProps>()
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeIdChange: [id: string | null] }>()
provideCandlestickChart(useCandlestickModel(props, emit as CandlestickChartEmit))
</script>

<template>
  <div class="candles" data-slot="candlestick-chart">
    <slot>
      <div class="stack">
        <CandlestickChartLegend />
        <CandlestickChartPlot />
      </div>
    </slot>
  </div>
</template>

<style scoped>
.candles { width: 100%; font-family: inherit; }
.stack { display: grid; gap: 12px; }
</style>

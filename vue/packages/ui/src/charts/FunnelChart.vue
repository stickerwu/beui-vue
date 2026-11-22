<script setup lang="ts">
import FunnelChartPlot from './FunnelChartPlot.vue'
import FunnelChartSummary from './FunnelChartSummary.vue'
import { provideFunnel, useFunnelModel, type FunnelChartProps } from './funnel-context'

defineSlots<{
  /** Compose `FunnelChartPlot` and `FunnelChartSummary`; omit it for the complete chart. */
  default?(): unknown
}>()
const props = defineProps<FunnelChartProps>()
const model = useFunnelModel(props)
provideFunnel(model)
const { label } = model
</script>

<template>
  <section class="funnel" data-slot="funnel-chart" :aria-label="label">
    <slot>
      <FunnelChartPlot />
      <FunnelChartSummary />
    </slot>
  </section>
</template>

<style scoped>
.funnel { display: flex; flex-direction: column; gap: 24px; width: 100%; }
</style>

<script setup lang="ts">
import LiquidityHeatmapLegend from './LiquidityHeatmapLegend.vue'
import LiquidityHeatmapPlot from './LiquidityHeatmapPlot.vue'
import { provideLiquidityHeatmap, useLiquidityHeatmapModel, type LiquidityHeatmapProps } from './liquidity-context'

defineSlots<{
  /** Compose `LiquidityHeatmapPlot` and `LiquidityHeatmapLegend`; omit it for the complete chart. */
  default?(): unknown
}>()
const props = defineProps<LiquidityHeatmapProps>()
const model = useLiquidityHeatmapModel(props)
provideLiquidityHeatmap(model)
const { label } = model
</script>

<template>
  <section class="heatmap" data-slot="liquidity-heatmap" :aria-label="label">
    <slot>
      <LiquidityHeatmapPlot />
      <LiquidityHeatmapLegend />
    </slot>
  </section>
</template>

<style scoped>
.heatmap { display: flex; flex-direction: column; gap: 16px; width: 100%; }
</style>

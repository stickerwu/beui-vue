<script setup lang="ts">
import { LIQUIDITY_HEAT as HEAT, useLiquidityHeatmap } from './liquidity-context'

const { t, formatSize, columns, prices, ceiling, unit } = useLiquidityHeatmap()
</script>

<template>
  <div v-if="prices.length && columns.length" class="legend" data-slot="liquidity-heatmap-legend">
    <span>{{ t('legend', { unit }) }}</span>
    <span class="scale"><span>0</span><span aria-hidden="true" class="swatches"><span v-for="color in HEAT" :key="color" :style="{ backgroundColor: color }" /></span><span>{{ formatSize(ceiling) }}+</span></span>
  </div>
</template>

<style scoped>
.legend { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; font-size: 10px; line-height: 1.5; color: var(--beui-muted-foreground); }
.scale { display: flex; align-items: center; gap: 8px; }
.swatches { display: flex; gap: 2px; }
.swatches span { width: 20px; height: 8px; border-radius: 1px; }
</style>

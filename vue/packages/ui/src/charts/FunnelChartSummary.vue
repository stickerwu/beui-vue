<script setup lang="ts">
import { funnelPercentage as percentage, useFunnelChart } from './funnel-context'

const { rows, first, last, conversion, formatValue, unit, t } = useFunnelChart()
</script>

<template>
  <div v-if="rows.length" class="summary" data-slot="funnel-chart-summary">
    <span class="muted">{{ t('range', { first: formatValue(first), last: formatValue(last), unit }) }}</span>
    <span class="overall"><span class="muted">{{ t('overall') }}</span><span class="figure">{{ percentage(conversion) }}</span></span>
  </div>
</template>

<style scoped>
.summary { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-top: 16px; border-top: 1px solid var(--beui-border); font-size: 12px; line-height: 16px; }
.overall { display: flex; align-items: center; gap: 8px; }
.figure { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-weight: 500; font-variant-numeric: tabular-nums; }
.muted { color: var(--beui-muted-foreground); }
</style>

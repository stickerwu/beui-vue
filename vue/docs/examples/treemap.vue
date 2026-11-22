<script setup lang="ts">
import { computed, ref } from 'vue'
import { Tabs, Treemap, TreemapLegend, TreemapPlot, TreemapTooltip } from 'beui-vue'

// Illustrative portfolio values only. Real values are supplied by the consumer.
const groups = [
  { id: 'technology', label: 'Technology', color: '#3454b5', companies: ['AAPL', 'MSFT', 'NVDA'] }, { id: 'healthcare', label: 'Healthcare', color: '#087e6c', companies: ['LLY', 'UNH', 'JNJ'] },
  { id: 'finance', label: 'Finance', color: '#7c3db5', companies: ['JPM', 'V', 'BAC'] }, { id: 'energy', label: 'Energy', color: '#a35318', companies: ['XOM', 'CVX', 'SHEL'] },
]
const quarters = [
  { value: 'q1', label: 'Q1', values: [210, 190, 130, 128, 85, 45, 80, 95, 30, 74, 62, 44] },
  { value: 'q2', label: 'Q2', values: [170, 220, 175, 108, 50, 60, 90, 75, 56, 68, 69, 34] },
  { value: 'q3', label: 'Q3', values: [260, 205, 155, 100, 95, 46, 140, 150, 0, 40, 50, 25] },
]
const quarter = ref('q1')
const data = computed(() => {
  const values = quarters.find(item => item.value === quarter.value)!.values
  return groups.map((group, index) => ({ id: group.id, label: group.label, color: group.color,
    children: group.companies.map((company, offset) => ({ id: company, label: company, value: values[index * 3 + offset] * 1000 })) }))
})
const format = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })
</script>

<template><div class="demo">
  <header><div><p class="title">Portfolio allocation</p><p class="note">Demo data</p></div>
    <Tabs v-model="quarter" :items="quarters" :labels="{ list: 'Portfolio quarter' }" /></header>
  <Treemap label="Portfolio allocation" :data="data" :format-value="format">
    <TreemapPlot class="demo-plot" />
    <TreemapTooltip />
    <TreemapLegend />
  </Treemap>
</div></template>

<style scoped>
.demo { width: 100%; max-width: 42rem; min-width: 0; padding-block: 8px; margin-inline: auto; --beui-primary: var(--beui-background); --beui-primary-foreground: var(--beui-foreground); }
header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
header p { margin: 0; }.title { font-size: 14px; line-height: 20px; font-weight: 500; }.note { margin-top: 4px !important; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.demo :deep(.be-tabs .be-trigger) { min-height: 32px; padding: 6px 12px; font-size: 12px; line-height: 16px; }
.demo :deep(.demo-plot) { height: 18rem; }
@media (min-width: 640px) { .demo :deep(.demo-plot) { height: 20rem; } }
</style>

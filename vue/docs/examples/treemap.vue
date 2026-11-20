<script setup lang="ts">
import { computed, ref } from 'vue'
import { Treemap, Tabs } from 'beui-vue'

const groups = [
  { label: 'Technology', color: '#3454b5', companies: ['AAPL', 'MSFT', 'NVDA'] }, { label: 'Healthcare', color: '#087e6c', companies: ['LLY', 'UNH', 'JNJ'] },
  { label: 'Finance', color: '#7c3db5', companies: ['JPM', 'V', 'BAC'] }, { label: 'Energy', color: '#a35318', companies: ['XOM', 'CVX', 'SHEL'] },
]
const quarters = [
  { value: 'q1', label: 'Q1', values: [210, 190, 130, 128, 85, 45, 80, 95, 30, 74, 62, 44] },
  { value: 'q2', label: 'Q2', values: [170, 220, 175, 108, 50, 60, 90, 75, 56, 68, 69, 34] },
  { value: 'q3', label: 'Q3', values: [260, 205, 155, 100, 95, 46, 140, 150, 0, 40, 50, 25] },
]
const quarter = ref('q1')
const data = computed(() => {
  const values = quarters.find(item => item.value === quarter.value)!.values
  return groups.map((group, index) => ({ id: group.label.toLowerCase(), label: group.label, color: group.color,
    children: group.companies.map((company, offset) => ({ id: company, label: company, value: values[index * 3 + offset] * 1000 })) }))
})
const format = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })
</script>

<template><div class="chart-demo" style="max-width:42rem"><header><div><strong>Portfolio allocation</strong><p>Demo data</p></div><Tabs v-model="quarter" :items="quarters" :labels="{ list: 'Portfolio quarter' }" /></header>
  <Treemap label="Portfolio allocation" :data="data" :format-value="format" />
</div></template>
<style scoped src="./chart-demo.css"></style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SankeyChart, Tabs } from 'beui-vue'

const nodes = [
  ['subscriptions', 'Subscriptions', '#2563eb'], ['services', 'Services', '#38bdf8'], ['marketplace', 'Marketplace', '#6366f1'],
  ['revenue', 'Revenue', '#64748b'], ['cost', 'Cost of revenue', '#e11d48'], ['gross', 'Gross profit', '#0d9488'],
  ['rnd', 'R&D', '#f59e0b'], ['sales', 'Sales & marketing', '#fb923c'], ['admin', 'G&A', '#fbbf24'], ['operating', 'Operating profit', '#16a34a'],
].map(([id, label, color]) => ({ id, label, color }))
const quarter = ref('q3')
const quarters = [{ value: 'q2', label: 'Q2' }, { value: 'q3', label: 'Q3' }]
const links = computed(() => {
  const [subscriptions, services, marketplace, cost, rnd, sales, admin] = quarter.value === 'q3' ? [70,17,14,36,22,17,7] : [62,18,10,34,20,16,7]
  const gross = subscriptions + services + marketplace - cost
  return [
    { source: 'subscriptions', target: 'revenue', value: subscriptions }, { source: 'services', target: 'revenue', value: services },
    { source: 'marketplace', target: 'revenue', value: marketplace }, { source: 'revenue', target: 'cost', value: cost },
    { source: 'revenue', target: 'gross', value: gross }, { source: 'gross', target: 'rnd', value: rnd },
    { source: 'gross', target: 'sales', value: sales }, { source: 'gross', target: 'admin', value: admin },
    { source: 'gross', target: 'operating', value: gross - rnd - sales - admin },
  ]
})
</script>

<template><div class="chart-demo" style="max-width:48rem"><header><Tabs v-model="quarter" :items="quarters" variant="segment" :labels="{ list: 'Quarter' }" /></header>
  <SankeyChart :label="`Income statement, ${quarter.toUpperCase()}`" :nodes="nodes" :links="links" :format-value="value => `$${value.toLocaleString('en-US')}M`" />
</div></template>
<style scoped src="./chart-demo.css"></style>

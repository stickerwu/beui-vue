<script setup lang="ts">
import { computed, ref } from 'vue'
import { BarChart, Tabs } from 'beui-vue'

const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa']
const layouts = [{ value: 'grouped', label: 'Grouped' }, { value: 'stacked', label: 'Stacked' }]
const orientations = [{ value: 'vertical', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }]
const layout = ref<'grouped' | 'stacked'>('grouped')
const orientation = ref<'vertical' | 'horizontal'>('vertical')
const sorted = ref(false)
const seed = ref(11)
const series = computed(() => {
  let state = seed.value
  const scales = [1, .85, .7, .4, .3, .2]
  function row(base: number) {
    return scales.map(scale => {
      state = state * 16807 % 2147483647
      return Math.round(base * scale * (.55 + state / 2147483647))
    })
  }
  return [
    { id: 'subscriptions', name: 'Subscriptions', color: '#2563eb', values: row(120) },
    { id: 'services', name: 'Services', color: '#38bdf8', values: row(70) },
    { id: 'marketplace', name: 'Marketplace', color: '#0d9488', values: row(45) },
  ]
})
</script>

<template>
  <div class="preview">
    <header><strong>Revenue by region</strong><p>Demo data, in thousands of dollars</p></header>
    <div class="controls">
      <Tabs :model-value="layout" :items="layouts" :labels="{ list: 'Layout' }" @update:model-value="layout = $event === 'stacked' ? 'stacked' : 'grouped'" />
      <Tabs :model-value="orientation" :items="orientations" :labels="{ list: 'Orientation' }" @update:model-value="orientation = $event === 'horizontal' ? 'horizontal' : 'vertical'" />
      <button type="button" :aria-pressed="sorted" @click="sorted = !sorted">Sort by total</button>
      <button type="button" @click="seed = seed * 48271 % 2147483647">New data</button>
    </div>
    <BarChart :key="orientation" :series="series" :categories="regions" :orientation="orientation" :layout="layout"
      :sort="sorted ? 'descending' : 'none'" label="Illustrative revenue by region"
      :format-value="value => `$${value}K`" :format-tick="value => value === 0 ? '$0' : `$${value}K`" />
  </div>
</template>

<style scoped>
.preview { width: 100%; max-width: 48rem; margin-inline: auto; }.preview strong { font-size: 14px; font-weight: 500; }.preview p { margin: 4px 0 0; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 12px 0 20px; --beui-primary: var(--beui-background); --beui-primary-foreground: var(--beui-foreground); }
.controls > button { padding: 6px 12px; font-size: 13px; font-weight: 500; border-radius: 6px; }.controls > button:is(:hover,[aria-pressed=true]) { background: var(--beui-muted); }
</style>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { BarChart, ButtonBase, Tabs } from 'beui-vue'

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
    <div class="intro">
      <div class="heading"><p class="title">Revenue by region</p><p class="sub">Demo data, in thousands of dollars</p></div>
      <div class="controls">
        <Tabs :model-value="layout" :items="layouts" :labels="{ list: 'Layout' }" @update:model-value="layout = $event === 'stacked' ? 'stacked' : 'grouped'" />
        <Tabs :model-value="orientation" :items="orientations" :labels="{ list: 'Orientation' }" @update:model-value="orientation = $event === 'horizontal' ? 'horizontal' : 'vertical'" />
        <ButtonBase variant="ghost" size="sm" :aria-pressed="sorted" :class="{ on: sorted }" @click="sorted = !sorted">Sort by total</ButtonBase>
        <ButtonBase variant="ghost" size="sm" @click="seed = seed * 48271 % 2147483647">New data</ButtonBase>
      </div>
    </div>
    <BarChart :key="orientation" :series="series" :categories="regions" :orientation="orientation" :layout="layout"
      :sort="sorted ? 'descending' : 'none'" label="Illustrative revenue by region"
      :format-value="value => `$${value}K`" :format-tick="value => value === 0 ? '$0' : `$${value}K`" />
  </div>
</template>

<style scoped>
.preview { display: grid; gap: 20px; width: 100%; max-width: 48rem; margin-inline: auto; }
.intro { display: grid; gap: 12px; }
.heading { display: grid; gap: 4px; }
.heading p { margin: 0; }
.title { font-size: 14px; line-height: 20px; font-weight: 500; color: var(--beui-foreground); }
.sub { font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; --beui-primary: var(--beui-background); --beui-primary-foreground: var(--beui-foreground); }
.controls .on { background: var(--beui-muted); color: var(--beui-foreground); }
</style>

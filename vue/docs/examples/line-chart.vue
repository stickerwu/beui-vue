<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef } from 'vue'
import { LineChart, Tabs } from 'beui-vue'

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const variant = shallowRef<'line' | 'area'>('area')
const seed = shallowRef(7)
const loading = shallowRef(false)
const series = computed(() => {
  let state = seed.value
  function walk(start: number, drift: number) {
    let current = start
    return months.map(() => {
      state = (state * 16807) % 2147483647
      current = Math.max(4, current + drift + (state / 2147483647 - 0.45) * 9)
      return Math.round(current * 10) / 10
    })
  }
  return [
    { id: 'this-year', name: 'This year', color: '#2563eb', values: walk(38, 2.4) },
    { id: 'last-year', name: 'Last year', color: '#a1a1aa', values: walk(32, 1.2) },
    { id: 'target', name: 'Target', color: '#0d9488', values: months.map((_, month) => 36 + month * 2.5) },
  ]
})
let timer: ReturnType<typeof setTimeout> | undefined
function regenerate() { seed.value = (seed.value * 48271) % 2147483647 }
function reload() {
  loading.value = true
  timer = setTimeout(() => { regenerate(); loading.value = false }, 1800)
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="chart-example">
    <div class="chart-heading">
      <div><strong>Monthly revenue</strong><p>Demo data, in thousands of dollars</p></div>
      <div class="chart-actions">
        <Tabs :items="[{ value: 'line', label: 'Line' }, { value: 'area', label: 'Area' }]" :model-value="variant" :labels="{ list: 'Chart style' }"
          @update:model-value="variant = $event === 'line' ? 'line' : 'area'" />
        <button type="button" :disabled="loading" @click="regenerate">New data</button>
        <button type="button" :disabled="loading" @click="reload">Reload</button>
      </div>
    </div>
    <LineChart :series="series" :categories="months" :variant="variant" :status="loading ? 'loading' : 'ready'"
      label="Illustrative monthly revenue" :format-value="value => `$${value.toFixed(1)}K`" :format-tick="value => value === 0 ? '$0' : `$${value}K`" />
  </div>
</template>

<style scoped>
.chart-example { width: 100%; max-width: 48rem; margin: auto; }
.chart-heading, .chart-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.chart-heading { justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.chart-heading strong { font-size: 14px; }
.chart-heading p { margin: 2px 0 0; font-size: 12px; line-height: 1.5; opacity: .7; }
.chart-actions { --beui-primary: var(--beui-background); --beui-primary-foreground: var(--beui-foreground); }
.chart-actions button { border-radius: 18px; font: 500 12px/1.4 inherit; font-size: 12px; min-height: 28px; padding: 3px 9px; cursor: pointer; }
.chart-actions button[aria-pressed='true'] { background: var(--vp-c-bg, Canvas); box-shadow: 0 1px 4px #0002; }
.chart-actions button:disabled { opacity: .5; }
</style>

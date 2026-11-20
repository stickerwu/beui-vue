<script setup lang="ts">
import { shallowRef } from 'vue'
import { BarChart } from 'beui-vue'

const layout = shallowRef<'grouped' | 'stacked'>('grouped')
const orientation = shallowRef<'vertical' | 'horizontal'>('vertical')
const sort = shallowRef<'none' | 'ascending' | 'descending'>('none')
const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
const series = [
  { id: 'web', name: 'Web', color: '#2563eb', values: [48, 62, 55, 72] },
  { id: 'mobile', name: 'Mobile', color: '#14b8a6', values: [24, 41, 36, 50] },
]
</script>

<template>
  <div style="width: 100%">
    <div class="options">
      <label>Layout <select v-model="layout"><option>grouped</option><option>stacked</option></select></label>
      <label>Orientation <select v-model="orientation"><option>vertical</option><option>horizontal</option></select></label>
      <label>Sort <select v-model="sort"><option>none</option><option>ascending</option><option>descending</option></select></label>
    </div>
    <BarChart label="Quarterly signups" :series="series" :categories="quarters" :layout="layout" :orientation="orientation" :sort="sort" />
  </div>
</template>

<style scoped>
.options { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; font-size: 12px; }
select { appearance: auto; background: transparent; color: inherit; }
</style>

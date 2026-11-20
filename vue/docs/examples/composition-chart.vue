<script setup lang="ts">
import { shallowRef } from 'vue'
import { CompositionChart } from 'beui-vue'

const view = shallowRef<'bar' | 'area'>('bar')
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const series = [
  { id: 'basic', name: 'Starter', color: '#2563eb', values: [62, 60, 54, 50, 44, 42] },
  { id: 'pro', name: 'Pro', color: '#38bdf8', values: [28, 30, 33, 36, 39, 40] },
  { id: 'team', name: 'Team', color: '#a5f3fc', values: [10, 10, 13, 14, 17, 18] },
]
</script>

<template>
  <div style="width: 100%"><label>Plan mix <select v-model="view" aria-label="Composition view"><option>bar</option><option>area</option></select></label>
    <CompositionChart label="Plan mix" :series="series" :periods="months" :view="view" />
  </div>
</template>

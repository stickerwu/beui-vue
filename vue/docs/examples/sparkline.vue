<script setup lang="ts">
import { shallowRef } from 'vue'
import { Sparkline } from 'beui-vue'

const variant = shallowRef<'line' | 'area'>('area')
const values = [39, 43, 41, 45, 52, 48, 55, 61, 52, 59, 70, 66, 72, 81]
const days = values.map((_, index) => `Nov ${index + 1}`)
</script>

<template>
  <div style="width: min(24rem, 100%)"><label>Daily signups <select v-model="variant" aria-label="Sparkline style"><option>area</option><option>line</option></select></label>
    <Sparkline label="Daily signups" :data="values" :labels="days" :variant="variant" color="#0d9488" :height="64" show-delta interactive />
  </div>
</template>

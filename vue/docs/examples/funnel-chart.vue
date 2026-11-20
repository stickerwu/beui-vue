<script setup lang="ts">
import { shallowRef } from 'vue'
import { FunnelChart } from 'beui-vue'

const direction = shallowRef<'vertical' | 'horizontal'>('vertical')
const stages = [
  { id: 'visit', label: 'Visitors', value: 12000 },
  { id: 'view', label: 'Product views', value: 8400 },
  { id: 'cart', label: 'Added to cart', value: 5100 },
  { id: 'paid', label: 'Purchased', value: 2900 },
]
</script>

<template>
  <div style="width: 100%"><label>Funnel direction <select v-model="direction"><option>vertical</option><option>horizontal</option></select></label>
    <FunnelChart :stages="stages" :direction="direction" unit="visitors" label="Purchase funnel" />
  </div>
</template>

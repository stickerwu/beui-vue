<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BeforeAfterSlider, ButtonBase, LineChart, Tabs, type LineChartSeries } from 'beui-vue'

const ready = ref(false)
const count = ref(0)
const activeTab = ref('overview')
const split = ref(45)
const tabs = [
  { value: 'overview', label: 'Overview', content: 'Consumer overview' },
  { value: 'activity', label: 'Activity', content: 'Recent activity' },
]
const series = computed<LineChartSeries[]>(() => [
  { id: 'orders', name: 'Orders', color: '#2563eb', values: [2, 4 + count.value] },
])
onMounted(() => { ready.value = true })
</script>

<template>
  <main :data-ready="ready">
    <ButtonBase @click="count++">Packed count {{ count }}</ButtonBase>
    <Tabs v-model="activeTab" :items="tabs" :labels="{ list: 'Consumer navigation' }" />
    <output aria-label="Selected tab">{{ activeTab }}</output>
    <BeforeAfterSlider v-model="split" :hint="false">
      <template #before>Before revision</template>
      <template #after>After revision</template>
    </BeforeAfterSlider>
    <output aria-label="Comparison percent">{{ split }}</output>
    <LineChart :series="series" :categories="['January', 'February']" label="Orders by month" />
  </main>
</template>

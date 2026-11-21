<script setup lang="ts">
import { computed, ref } from 'vue'
import { VolumeProfile, Tabs } from 'beui-vue'

// Illustrative executed volume, already aggregated into $100 price ranges.
// Price-bin identities stay stable when the session changes.
const sessions = [
  { value: 'today', label: 'Today', volumes: [18, 27, 36, 52, 70, 96, 135, 172, 205, 241, 278, 225, 192, 146, 108, 79, 56, 42, 31, 22, 16, 11, 8, 5] },
  { value: 'previous', label: 'Previous', volumes: [6, 9, 13, 18, 27, 40, 56, 74, 95, 114, 146, 188, 242, 286, 253, 208, 165, 126, 92, 65, 42, 30, 21, 14] },
  { value: 'week', label: 'Week', volumes: [75, 104, 143, 214, 305, 382, 494, 626, 795, 902, 1028, 1182, 1097, 973, 825, 695, 589, 481, 372, 289, 195, 154, 119, 84] },
]
const session = ref('today')
const data = computed(() => sessions.find(item => item.value === session.value)!.volumes.map((volume, index) => ({
  id: `price-${64000 + index * 100}`, priceLow: 64000 + index * 100, priceHigh: 64100 + index * 100, volume,
})))
const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
</script>

<template><div class="demo">
  <header><div><p class="title">BTC / USD</p><p class="note">Volume by price · Demo data</p></div>
    <Tabs v-model="session" :items="sessions" :labels="{ list: 'Profile session' }" /></header>
  <VolumeProfile label="BTC volume profile" unit="BTC" :data="data" :format-price="usd" :format-volume="value => value.toLocaleString('en-US', { maximumFractionDigits: 2 })" plot-class="demo-plot" />
</div></template>

<style scoped>
.demo { width: 100%; max-width: 36rem; min-width: 0; padding-block: 8px; margin-inline: auto; --beui-primary: var(--beui-background); --beui-primary-foreground: var(--beui-foreground); }
header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 24px; }
header p { margin: 0; }.title { font-size: 14px; line-height: 20px; font-weight: 500; }.note { margin-top: 4px !important; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.demo :deep(.be-tabs .be-trigger) { min-height: 32px; padding: 6px 12px; font-size: 12px; line-height: 16px; }
.demo :deep(.demo-plot) { height: 18rem; }
@media (min-width: 640px) { .demo :deep(.demo-plot) { height: 20rem; } }
</style>

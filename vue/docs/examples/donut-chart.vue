<script setup lang="ts">
import { shallowRef } from 'vue'
import { DonutChart } from 'beui-vue'

const selected = shallowRef<string | null>(null)
// Illustrative figures only.
const segments = [
  { id: 'team', name: 'Team', color: '#2563eb', value: 42900 },
  { id: 'business', name: 'Business', color: '#38bdf8', value: 31250 },
  { id: 'enterprise', name: 'Enterprise', color: '#0d9488', value: 22600 },
  { id: 'starter', name: 'Starter', color: '#fbbf24', value: 18400 },
]
const usd = (value: number) => value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
</script>

<template>
  <div class="plans">
    <DonutChart style="--donut-plot-width: 15rem" label="Monthly revenue by plan" :labels="{ total: 'Monthly revenue' }" :segments="segments" :format-value="usd" :selected-id="selected" @select="selected = selected === $event ? null : $event" />
    <p aria-live="polite">{{ selected ? `Filtering by ${segments.find(segment => segment.id === selected)?.name}` : 'Select a plan to filter' }}</p>
  </div>
</template>

<style scoped>
.plans { width: 100%; max-width: 36rem; }
.plans > * + * { margin-top: 12px; }
.plans p { margin: 12px 0 0; padding-inline: 4px; color: var(--beui-muted-foreground); font-size: 12px; line-height: 16px; }
</style>

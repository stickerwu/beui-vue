<script setup lang="ts">
import { CompositionChart } from 'beui-vue'

const periods = Array.from({ length: 36 }, (_, day) => new Date(Date.UTC(2026, 7, day + 1)).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }))
const series = [
  { id: 'organic', name: 'Organic search', color: '#2563eb', base: 46, trend: -.45 },
  { id: 'direct', name: 'Direct', color: '#38bdf8', base: 24, trend: .12 },
  { id: 'referral', name: 'Referrals', color: '#0d9488', base: 10, trend: .32 },
  { id: 'social', name: 'Social', color: '#fbbf24', base: 12, trend: .06 },
  { id: 'email', name: 'Email', color: '#a78bfa', base: 5, trend: .09 },
  { id: 'other', name: 'Other', color: '#a1a1aa', base: 3, trend: .02 },
].map(({ base, trend, ...row }, index) => ({ ...row, values: periods.map((_, day) => Math.round((base + day * trend + Math.sin(day * 1.7 + index * 2) * Math.min(base / 3, 5)) * 120)) }))
const views = ['bar', 'area'] as const
</script>

<template>
  <div class="composition"><div v-for="view in views" :key="view">
    <CompositionChart label="Illustrative acquisition channel shares" :series="series" :periods="periods" :view="view" :format-value="value => `${value.toLocaleString('en')} visits`" />
  </div>
  </div>
</template>

<style scoped>.composition { width: 100%; }.composition > div + div { margin-top: 40px; border-top: 1px solid var(--beui-border); padding-top: 40px; }</style>

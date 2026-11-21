<script setup lang="ts">
import { computed, ref } from 'vue'
import { ButtonBase, Sparkline } from 'beui-vue'

// Illustrative metrics live in the demo. A seeded generator keeps server and client markup identical;
// "Add sample" shifts each window like a live feed.
function walk(seed: number, length: number, start: number, drift: number, noise: number) {
  let state = seed
  let value = start
  return Array.from({ length }, () => {
    state = state * 16807 % 2147483647
    value = Math.max(0, value + drift + (state / 2147483647 - .5) * noise)
    return Math.round(value * 100) / 100
  })
}
const days = Array.from({ length: 60 }, (_, index) => new Date(Date.UTC(2026, 8, 1 + index)).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }))
const WINDOW = 30
const revenue = walk(14, 60, 42, .6, 7)
const users = walk(49, 60, 1800, 4, 160)
const errors = walk(49, 60, 2.4, -.03, .5)
const money = (value: number) => `$${value.toFixed(1)}K`
const offset = ref(0)
const slice = <T,>(values: readonly T[]) => values.slice(offset.value, offset.value + WINDOW)
const labels = computed(() => slice(days))
const cards = computed(() => [
  { id: 'revenue', title: 'Revenue', value: money(slice(revenue).at(-1) ?? 0), data: slice(revenue), color: '#2563eb', format: money, invert: false },
  { id: 'users', title: 'Active users', value: Math.round(slice(users).at(-1) ?? 0).toLocaleString('en'), data: slice(users), color: '#0d9488', format: (value: number) => Math.round(value).toLocaleString('en'), invert: false },
  // Fewer errors is good news.
  { id: 'errors', title: 'Error rate', value: `${(slice(errors).at(-1) ?? 0).toFixed(2)}%`, data: slice(errors), color: '#e11d48', format: (value: number) => `${value.toFixed(2)}%`, invert: true },
])
</script>

<template>
  <div class="preview">
    <div class="bar">
      <span class="muted">Last 30 days, demo data</span>
      <ButtonBase variant="ghost" size="sm" :disabled="offset >= days.length - WINDOW" @click="offset = Math.min(days.length - WINDOW, offset + 1)">Add sample</ButtonBase>
    </div>
    <div class="cards">
      <div v-for="card in cards" :key="card.id" class="card">
        <div class="meta"><span class="muted small">{{ card.title }}</span><span class="figure">{{ card.value }}</span></div>
        <Sparkline :data="card.data" :labels="labels" :label="`${card.title}, last 30 days`" variant="area" :color="card.color" :height="40" show-delta :invert-delta="card.invert" :format-value="card.format" />
      </div>
    </div>
    <div class="card">
      <p class="muted small hint">Interactive: hover, drag or use the arrow keys</p>
      <Sparkline :data="slice(users)" :labels="labels" label="Active users, last 30 days" color="#0d9488" :height="48" :stroke-width="2" interactive :format-value="cards[1].format" />
    </div>
  </div>
</template>

<style scoped>
.preview { display: grid; gap: 24px; width: 100%; max-width: 48rem; }
.bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.muted { color: var(--beui-muted-foreground); }
.bar .muted { font-size: 14px; line-height: 20px; }
.small { font-size: 12px; line-height: 16px; }
.cards { display: grid; gap: 12px; }
.card { min-width: 0; padding: 16px; border: 1px solid var(--beui-border); border-radius: 12px; background: var(--beui-card); }
.card > * + * { margin-top: 12px; }
.meta { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.figure { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 14px; line-height: 20px; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--beui-foreground); }
.card > .hint { margin: 0; }
@media (min-width: 640px) { .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>

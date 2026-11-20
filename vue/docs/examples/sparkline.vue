<script setup lang="ts">
import { computed, ref } from 'vue'
import { Sparkline } from 'beui-vue'

function walk(state: number, value: number, drift: number, noise: number) {
  return Array.from({ length: 60 }, () => {
    state = state * 16807 % 2147483647
    value = Math.max(0, value + drift + (state / 2147483647 - .5) * noise)
    return Math.round(value * 100) / 100
  })
}
const offset = ref(0)
const days = Array.from({ length: 60 }, (_, index) => new Date(Date.UTC(2026, 8, 1 + index)).toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }))
const metrics = [
  { title: 'Revenue', color: '#2563eb', values: walk(14, 42, .6, 7), format: (value: number) => `$${value.toFixed(1)}K` },
  { title: 'Active users', color: '#0d9488', values: walk(49, 1800, 4, 160), format: (value: number) => Math.round(value).toLocaleString('en') },
  { title: 'Error rate', color: '#e11d48', values: walk(49, 2.4, -.03, .5), format: (value: number) => `${value.toFixed(2)}%` },
]
const labels = computed(() => days.slice(offset.value, offset.value + 30))
const cards = computed(() => metrics.map(metric => ({ ...metric, data: metric.values.slice(offset.value, offset.value + 30) })))
</script>

<template>
  <div class="preview">
    <div class="head"><span>Last 30 days, demo data</span><button type="button" :disabled="offset >= 30" @click="offset++">Add sample</button></div>
    <div class="cards"><section v-for="card in cards" :key="card.title"><header><span>{{ card.title }}</span><b>{{ card.format(card.data[29]) }}</b></header>
      <Sparkline :label="`${card.title}, last 30 days`" :data="card.data" :labels="labels" :color="card.color" :format-value="card.format" variant="area" show-delta :invert-delta="card.title === 'Error rate'" />
    </section></div>
    <section><header>Interactive: hover, drag or use the arrow keys</header><Sparkline label="Active users, last 30 days" :data="cards[1].data" :labels="labels" :color="cards[1].color" :format-value="cards[1].format" :height="48" interactive /></section>
  </div>
</template>

<style scoped>
.preview { width: 100%; max-width: 48rem; margin-inline: auto; }.head, header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }.head { font-size: 14px; }.head button { padding: 5px 12px; font-size: 13px; }.cards { display: grid; gap: 12px; margin-block: 24px; }
section { min-width: 0; padding: 16px; border: 1px solid var(--beui-border); border-radius: 12px; background: var(--beui-card); } header { color: var(--beui-muted-foreground); font-size: 12px; margin-bottom: 12px; } header b { font: 500 14px/1.4 ui-monospace, monospace; color: var(--beui-foreground); } @media(min-width:640px) { .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
</style>

<script setup lang="ts">
import { BumpChart, ButtonBase } from 'beui-vue'
import { shallowRef } from 'vue'

const periods = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
// Illustrative product rankings; replace these with your own period-by-period ranks.
const series = shallowRef([
  { id: 'studio', name: 'Studio', ranks: [4, 3, 2, 3, 2, 1], color: '#8b5cf6' },
  { id: 'canvas', name: 'Canvas', ranks: [1, 1, 3, 2, 1, 2], color: '#0d9488' },
  { id: 'layers', name: 'Layers', ranks: [3, 2, 1, 1, 3, 3], color: '#f59e0b' },
  { id: 'orbit', name: 'Orbit', ranks: [2, 4, 5, 4, 5, 4], color: '#3b82f6' },
  { id: 'frame', name: 'Frame', ranks: [5, 5, 4, 5, 4, 5], color: '#f43f5e' },
])
function shuffle() {
  // Each period is a permutation: exactly one product at each rank.
  const columns = periods.map(() => {
    const ranks = series.value.map((_, index) => index + 1)
    for (let from = ranks.length - 1; from > 0; from--) {
      const to = Math.floor(Math.random() * (from + 1))
      ;[ranks[from], ranks[to]] = [ranks[to], ranks[from]]
    }
    return ranks
  })
  series.value = series.value.map((row, index) => ({ ...row, ranks: columns.map(column => column[index]) }))
}
</script>

<template>
  <div class="bump-demo">
    <div class="top">
      <div><h3>The leaderboard</h3><p>Five products. Six months. Every move.</p></div>
      <ButtonBase variant="ghost" size="sm" class="shuffle" @click="shuffle">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 14 4 4-4 4" /><path d="m18 2 4 4-4 4" /><path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" /><path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" /><path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" /></svg>
        Shuffle rankings
      </ButtonBase>
    </div>
    <BumpChart label="Illustrative product rankings, April to September" :series="series" :periods="periods" />
    <p class="hint">Inspect a dot for details · Select to pin a product</p>
  </div>
</template>

<style scoped>
.bump-demo { display: flex; flex-direction: column; gap: 24px; width: 100%; }
.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; padding: 0 8px; }
h3 { margin: 0; padding: 0; border: 0; letter-spacing: normal; font-size: 14px; line-height: 20px; font-weight: 500; color: var(--beui-foreground); }
.top p { margin: 4px 0 0; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.bump-demo .shuffle { flex: none; gap: 8px; }
.hint { margin: 0; text-align: center; font-size: 11px; line-height: 1.5; color: var(--beui-muted-foreground); }
</style>

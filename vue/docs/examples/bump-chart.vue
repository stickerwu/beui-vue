<script setup lang="ts">
import { BumpChart } from 'beui-vue'
import { shallowRef } from 'vue'

const periods = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']
const series = shallowRef([
  { id: 'studio', name: 'Studio', ranks: [4, 3, 2, 3, 2, 1], color: '#8b5cf6' },
  { id: 'canvas', name: 'Canvas', ranks: [1, 1, 3, 2, 1, 2], color: '#0d9488' },
  { id: 'layers', name: 'Layers', ranks: [3, 2, 1, 1, 3, 3], color: '#f59e0b' },
  { id: 'orbit', name: 'Orbit', ranks: [2, 4, 5, 4, 5, 4], color: '#3b82f6' },
  { id: 'frame', name: 'Frame', ranks: [5, 5, 4, 5, 4, 5], color: '#f43f5e' },
])
function shuffle() {
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
  <div class="chart-demo"><header><div><strong>The leaderboard</strong><p>Five products. Six months. Every move.</p></div><button type="button" @click="shuffle">Shuffle rankings</button></header>
    <BumpChart label="Illustrative product rankings, April to September" :series="series" :periods="periods" />
    <footer>Inspect a dot for details · Select to pin a product</footer>
  </div>
</template>
<style scoped src="./chart-demo.css"></style>

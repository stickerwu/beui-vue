<script setup lang="ts">
import { Mines } from 'beui-vue'
import { shallowRef } from 'vue'

// A fixed seed keeps the demo's mine layout reproducible for the end-to-end checks; the component itself defaults to Math.random.
let seed = 1
function seeded() {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
  return seed / 2 ** 32
}
const best = shallowRef(0)
function cashOut(multiplier: number) { best.value = Math.max(best.value, multiplier) }
</script>

<template>
  <div class="mines-demo">
    <p class="best">Best cash out <span>{{ best.toFixed(2) }}×</span></p>
    <Mines :random="seeded" @cash-out="cashOut" />
  </div>
</template>

<style scoped>
.mines-demo { display: flex; width: 100%; max-width: 28rem; flex-direction: column; align-items: center; gap: .75rem; }
.best { margin: 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); font-variant-numeric: tabular-nums; }
.best span { font-weight: 500; color: var(--beui-foreground); }
</style>

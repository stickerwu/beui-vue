<script setup lang="ts">
import { Crash } from 'beui-vue'
import { shallowRef } from 'vue'

const best = shallowRef(0)
// Multipliers print with two decimals, as the game does; 1.00 before the first cash out.
const format = (value: number) => `${value.toFixed(2)}×`
</script>

<template>
  <div class="demo">
    <p class="best">Best cash out <span>{{ format(best) }}</span></p>
    <Crash @cash-out="(multiplier: number) => (best = Math.max(best, multiplier))" />
  </div>
</template>

<style scoped>
.demo { display: flex; flex-direction: column; align-items: center; gap: .75rem; width: 100%; max-width: 28rem; }
.best { margin: 0; font-size: .875rem; line-height: 1.25rem; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.best span { font-weight: 500; color: var(--beui-foreground); }
</style>

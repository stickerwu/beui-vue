<script setup lang="ts">
import { AnimatedNumber } from 'beui-vue'
const format = (n: number) => `$${Math.round(n).toLocaleString()}`
</script>

<template>
  <div class="number-demo">
    <p class="number-label">Monthly recurring revenue</p>
    <div class="number-value"><AnimatedNumber :value="129480" :format="format" /></div>
    <p class="number-delta">+12.4% vs last month</p>
  </div>
</template>

<style scoped>
.number-demo { display: flex; flex-direction: column; align-items: center; gap: .75rem; }
p { margin: 0; font-size: .75rem; line-height: 1rem; }
.number-label { color: var(--beui-muted-foreground); }
.number-value { font-size: 2.25rem; line-height: 2.5rem; font-weight: 600; letter-spacing: -.025em; color: var(--beui-foreground); font-variant-numeric: tabular-nums; }
.number-delta { color: oklch(70% .18 155); }
</style>

<script setup lang="ts">
import { ButtonBase, LiquidityHeatmap } from 'beui-vue'
import { computed, ref } from 'vue'

// Deterministic illustrative order-book history; no market feed is implied.
const phase = ref(0)
const snapshots = computed(() => Array.from({ length: 24 }, (_, time) => ({
  id: `minute-${time}`, label: `14:${String(time * 2).padStart(2, '0')}`,
  price: 245.5 + Math.sin(time * .27 + phase.value * .4) * 1.2 + time * .035,
  levels: Array.from({ length: 18 }, (_, row) => {
    const shelf = Math.exp(-((row - 4 - Math.sin(time * .18 + phase.value) * .7) ** 2) / .8)
      + Math.exp(-((row - 13 + Math.cos(time * .15 + phase.value) * .8) ** 2) / 1.2)
    const noise = (Math.sin(row * 12.9 + time * 7.3 + phase.value * 2.1) + 1) / 2
    return { price: 250 - row * .5, size: Math.round(90 + noise * 350 + shelf * (1500 + Math.sin(time * .3 + phase.value) * 450)) }
  }),
})))
</script>

<template><div class="demo">
  <div class="top"><div><h3>Where liquidity rests</h3><p>SOL / USD · Simulated depth</p></div>
    <ButtonBase variant="ghost" size="sm" class="resim" @click="phase++">
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>
      Resimulate
    </ButtonBase>
  </div>
  <LiquidityHeatmap :snapshots="snapshots" :max-size="2400" unit="SOL" :format-price="value => `$${value.toFixed(2)}`" />
  <p class="foot">Brighter bands hold more liquidity · White line tracks price</p>
</div></template>

<style scoped>
.demo { display: flex; flex-direction: column; gap: 24px; width: 100%; }
.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
.demo .top h3 { margin: 0; padding: 0; border: 0; font-size: 14px; line-height: 20px; font-weight: 500; letter-spacing: normal; }
.top p { margin: 4px 0 0; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.resim { gap: 8px; }
.foot { margin: 0; text-align: center; font-size: 11px; line-height: 16px; color: var(--beui-muted-foreground); }
</style>

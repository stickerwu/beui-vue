<script setup lang="ts">
import { LiquidityHeatmap } from 'beui-vue'
import { computed, ref } from 'vue'

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

<template><div class="chart-demo"><header><div><strong>Where liquidity rests</strong><p>SOL / USD · Simulated depth</p></div><button type="button" @click="phase++">Resimulate</button></header>
  <LiquidityHeatmap :snapshots="snapshots" :max-size="2400" unit="SOL" :format-price="value => `$${value.toFixed(2)}`" />
  <footer>Brighter bands hold more liquidity · White line tracks price</footer>
</div></template>
<style scoped src="./chart-demo.css"></style>

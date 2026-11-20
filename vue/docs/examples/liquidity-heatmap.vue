<script setup lang="ts">
import { LiquidityHeatmap } from 'beui-vue'

const snapshots = Array.from({ length: 12 }, (_, index) => ({
  id: `minute-${index}`, label: `10:${String(index * 5).padStart(2, '0')}`, price: 102 + Math.sin(index * .5) * 1.4,
  levels: Array.from({ length: 7 }, (_, row) => ({ price: 105 - row, size: Math.round(240 + 220 * Math.cos(row * .9 + index * .54)) })),
}))
</script>

<template><LiquidityHeatmap label="Liquidity across prices" :snapshots="snapshots" unit="shares" /></template>

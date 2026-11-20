<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { CandlestickChart } from 'beui-vue'

const offset = shallowRef(0)
const candles = computed(() => Array.from({ length: 32 }, (_, index) => {
  const minute = index + offset.value
  const price = (at: number) => 100 + at * .13 + Math.sin(at * .42) * 2.7 + Math.cos(at * .87) * .8
  const open = price(minute), close = price(minute + 1)
  const time = new Date(Date.UTC(2026, 10, 20, 14, minute))
  return { id: time.toISOString(), label: time.toISOString().slice(11, 16), open, close,
    high: Math.max(open, close) + .4 + Math.abs(Math.sin(minute)) * .8,
    low: Math.min(open, close) - .4 - Math.abs(Math.cos(minute)) * .6, volume: Math.round(2400 + Math.abs(Math.sin(minute * .65)) * 5200) }
}))
</script>

<template>
  <div style="width: 100%"><button type="button" @click="offset++">Next candle</button>
    <CandlestickChart label="Intraday prices" :candles="candles" :last-price="candles.at(-1)?.close" />
  </div>
</template>

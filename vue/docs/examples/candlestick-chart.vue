<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { CandlestickChart } from 'beui-vue'

const playing = ref(true)
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 3600) % 24).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}`
let close = 2380, tick = 0
const candles = shallowRef(Array.from({ length: 48 }, (_, index) => {
  const open = close
  close = open * (1 + Math.sin(index * .7) * .004 + Math.cos(index * .23) * .003)
  const reach = Math.abs(close - open) * .6 + 1.5 + Math.abs(Math.sin(index * 1.9)) * 3
  const start = 43200 + index * 300
  return { id: String(start), label: formatTime(start), open, close,
    high: Math.max(open, close) + reach * Math.abs(Math.cos(index * 1.3)), low: Math.min(open, close) - reach * Math.abs(Math.sin(index * .9)),
    volume: 120 + Math.abs(Math.sin(index * .6)) * 420 }
}))
function step() {
  tick++
  const last = candles.value[candles.value.length - 1]
  const price = last.close * (1 + Math.sin(tick * 1.7) * .0012 + Math.cos(tick * .6) * .0006)
  const next = [...candles.value.slice(0, -1), { ...last, close: price, high: Math.max(last.high, price), low: Math.min(last.low, price), volume: last.volume + 12 + Math.abs(Math.sin(tick)) * 30 }]
  if (tick % 8 === 0) {
    const start = Number(last.id) + 300
    next.shift()
    next.push({ id: String(start), label: formatTime(start), open: price, close: price, low: price, high: price, volume: 0 })
  }
  candles.value = next
}
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { if (playing.value && !document.hidden) step() }, 900) })
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="chart-demo" style="max-width:48rem"><header><strong>ETH / USD · 5m <small class="sim">Simulated</small></strong><div><button type="button" @click="playing = !playing">{{ playing ? 'Pause' : 'Resume' }}</button><button type="button" @click="playing = false; step()">Step</button></div></header>
    <CandlestickChart label="Simulated ETH / USD, 5 minute candles" :candles="candles" :last-price="candles.at(-1)?.close" :format-price="value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })" />
  </div>
</template>
<style scoped src="./chart-demo.css"></style>

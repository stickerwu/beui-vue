<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { ButtonBase, CandlestickChart } from 'beui-vue'

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
/** Folds a simulated trade into the live candle; every eighth beat opens a new one. */
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
  <div class="candle-demo">
    <div class="top">
      <div class="title">ETH / USD · 5m <span class="sim">Simulated</span></div>
      <div class="actions">
        <ButtonBase variant="ghost" size="sm" @click="playing = !playing">{{ playing ? 'Pause' : 'Resume' }}</ButtonBase>
        <ButtonBase variant="ghost" size="sm" @click="playing = false; step()">Step</ButtonBase>
      </div>
    </div>
    <CandlestickChart label="Simulated ETH / USD, 5 minute candles" style="--candles-gap: 16px" :height="320" :candles="candles" :last-price="candles.at(-1)?.close"
      :format-price="value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })" />
  </div>
</template>

<style scoped>
.candle-demo { width: 100%; max-width: 48rem; margin-inline: auto; }
.candle-demo > * + * { margin-top: 12px; }
.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-inline: 4px; }
.title { display: flex; align-items: center; gap: 8px; font-size: 14px; line-height: 20px; font-weight: 500; }
.sim { padding: 2px 6px; border: 1px solid var(--beui-border); border-radius: 4px; font-size: 9px; line-height: 1.5; font-weight: 400; letter-spacing: .05em; text-transform: uppercase; color: var(--beui-muted-foreground); }
.actions { display: flex; align-items: center; gap: 8px; }
</style>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import ChartInspector from './ChartInspector.vue'

interface Candle { id: string; label: string; open: number; high: number; low: number; close: number; volume: number }
const props = withDefaults(defineProps<{
  candles: readonly Candle[]; lastPrice?: number; activeId?: string | null; defaultActiveId?: string | null; label?: string
  formatPrice?: (value: number) => string; formatVolume?: (value: number) => string; labels?: Partial<Record<string, string>>
}>(), { formatPrice: (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 }), formatVolume: (value: number) => value.toLocaleString('en-US', { notation: 'compact' }) })
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeIdChange: [id: string | null] }>()
const active = shallowRef(props.defaultActiveId ?? null)
const candles = computed(() => props.candles.filter(candle => [candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite)))
const index = computed(() => candles.value.findIndex(candle => candle.id === (props.activeId === undefined ? active.value : props.activeId)))
const inspected = computed(() => candles.value[index.value] ?? candles.value.at(-1))
const scale = computed(() => {
  const lows = candles.value.map(candle => candle.low), highs = candles.value.map(candle => candle.high)
  if (props.lastPrice !== undefined && Number.isFinite(props.lastPrice)) { lows.push(props.lastPrice); highs.push(props.lastPrice) }
  const min = lows.length ? Math.min(...lows) : 0, max = highs.length ? Math.max(...highs) : 1
  const pad = Math.max((max - min) * .08, max * .0005, .0001)
  return { min: min - pad, max: max + pad, volumeMax: Math.max(1, ...candles.value.map(candle => candle.volume)) }
})
const priceY = (value: number) => (scale.value.max - value) / (scale.value.max - scale.value.min) * 76
const marks = computed(() => candles.value.map((candle, ordinal) => ({
  ...candle, x: (ordinal + .5) / candles.value.length * 100, width: .64 / candles.value.length * 100,
  volumeHeight: candle.volume / scale.value.volumeMax * 16, up: candle.close >= candle.open,
})))
const keys = ['open', 'high', 'low', 'close'] as const
const descriptions = computed(() => candles.value.map(candle => `${candle.label}: ${keys.map(key => `${key} ${props.formatPrice(candle[key])}`).join(', ')}`))
const title = computed(() => props.label ?? props.labels?.label ?? 'Candlestick chart')
function inspect(id: string | null) {
  if (props.activeId === undefined) active.value = id
  emit('update:activeId', id); emit('activeIdChange', id)
}
</script>

<template>
  <section class="candles" data-slot="candlestick-chart" :aria-label="title">
    <div v-if="inspected" class="readings"><strong>{{ inspected.label }}</strong><span v-for="key in keys" :key="key">{{ labels?.[key] ?? key[0].toUpperCase() }} <b>{{ formatPrice(inspected[key]) }}</b></span><span>{{ labels?.volume ?? 'Vol' }} <b>{{ formatVolume(inspected.volume) }}</b></span></div>
    <div class="plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path v-for="line in [8, 28, 48, 68]" :key="line" :d="`M0,${line} H100`" fill="none" stroke="currentColor" opacity=".16" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke" />
      <g v-for="mark in marks" :key="mark.id" :fill="mark.up ? '#059669' : '#e11d48'">
        <line :x1="mark.x" :x2="mark.x" :y1="priceY(mark.high)" :y2="priceY(mark.low)" :stroke="mark.up ? '#059669' : '#e11d48'" vector-effect="non-scaling-stroke" />
        <rect :x="mark.x - mark.width / 2" :y="Math.min(priceY(mark.open), priceY(mark.close))" :width="mark.width" :height="Math.max(.45, Math.abs(priceY(mark.open) - priceY(mark.close)))" />
        <rect :x="mark.x - mark.width / 2" :width="mark.width" :y="100 - mark.volumeHeight" :height="mark.volumeHeight" opacity=".45" />
      </g>
      <path v-if="lastPrice !== undefined" :d="`M0,${priceY(lastPrice)} H100`" stroke="currentColor" fill="none" vector-effect="non-scaling-stroke" stroke-dasharray="4 3" />
      <path v-if="marks[index]" :d="`M${marks[index].x},0 V100`" stroke="currentColor" fill="none" vector-effect="non-scaling-stroke" stroke-dasharray="3 3" />
    </svg><span v-if="lastPrice !== undefined" class="price" :style="{ top: `${priceY(lastPrice)}%` }">{{ formatPrice(lastPrice) }}</span>
      <ChartInspector :label="`${title}: inspect candles`" :values="descriptions" :index="index" band @inspect="inspect(candles[$event].id)" @close="inspect(null)" />
    </div>
    <div class="times"><small>{{ candles[0]?.label }}</small><small>{{ candles.at(-1)?.label }}</small></div>
  </section>
</template>

<style scoped>
.candles { width: 100%; font-variant-numeric: tabular-nums; }
.readings, .times { display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px; }
.readings { margin-bottom: 10px; }
.times { justify-content: space-between; }
.plot { position: relative; margin-right: 36px; height: 224px; }
.plot svg { width: 100%; height: 100%; }
.plot:focus-within { outline: 2px solid currentColor; outline-offset: 3px; }
.price { position: absolute; left: 100%; transform: translateY(-50%); background: CanvasText; color: Canvas; border-radius: 3px; padding: 1px 3px; font: 10px/1.4 system-ui; }
</style>

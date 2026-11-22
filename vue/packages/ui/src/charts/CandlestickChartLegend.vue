<script setup lang="ts">
import { computed } from 'vue'
import { useCandlestickChart, type Candle } from './candlestick-context'

defineSlots<{
  /** Custom readout. Receives the crosshair candle, or the latest one, and its percent change. */
  default?(props: { candle: Candle; change: number }): unknown
}>()
/** OHLC and volume readout that follows the crosshair. */
const { candles, active, formatPrice, formatVolume, t } = useCandlestickChart()
const focus = computed(() => active.value !== null ? candles.value[active.value] : candles.value.at(-1))
const change = computed(() => focus.value?.open ? (focus.value.close - focus.value.open) / focus.value.open * 100 : 0)
const tone = computed(() => change.value >= 0 ? 'up' : 'down')
const legendItems = computed(() => {
  const candle = focus.value
  if (!candle) return []
  return [
    ['open', formatPrice(candle.open)], ['high', formatPrice(candle.high)], ['low', formatPrice(candle.low)],
    ['close', formatPrice(candle.close)], ['volume', formatVolume(candle.volume)],
  ] as const
})
</script>

<template>
  <slot v-if="focus && $slots.default" :candle="focus" :change="change" />
  <dl v-else-if="focus" class="legend be-candles" :class="tone">
    <dt class="sr">{{ t('candle') }}</dt>
    <dd class="muted">{{ focus.label }}</dd>
    <div v-for="[term, value] in legendItems" :key="term" class="item">
      <dt class="muted">{{ t(term) }}</dt>
      <dd :class="{ tone: term !== 'volume' }">{{ value }}</dd>
    </div>
    <dd class="tone">{{ change >= 0 ? '+' : '−' }}{{ Math.abs(change).toFixed(2) }}%</dd>
  </dl>
</template>

<style scoped>
.legend { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin: 0; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 12px; line-height: calc(4 / 3); font-variant-numeric: tabular-nums; }
.legend > * { margin: 0; }
.legend .item { display: flex; gap: 4px; }
.legend .item > * { margin: 0; }
.muted { color: var(--beui-muted-foreground); }
.sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.legend.up .tone { color: #059669; }
.legend.down .tone { color: #e11d48; }
</style>

<style>
.dark .be-candles.legend.up .tone, [data-beui-theme='dark'] .be-candles.legend.up .tone { color: #34d399; }
.dark .be-candles.legend.down .tone, [data-beui-theme='dark'] .be-candles.legend.down .tone { color: #fb7185; }
</style>

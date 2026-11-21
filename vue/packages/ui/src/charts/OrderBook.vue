<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, getCurrentInstance, shallowRef } from 'vue'
import { panelSpring } from '../core/motion'
import OrderBookDepthRow from './OrderBookDepthRow.vue'
import { interpolate } from './plot-utils'

interface Level { price: number; size: number }
interface DepthLevel extends Level { total: number }
type Side = 'bid' | 'ask'
type Active = { side: Side; price: number } | null
const props = withDefaults(defineProps<{
  bids: readonly Level[]; asks: readonly Level[]; levels?: number; lastPrice?: number; label?: string; baseSymbol?: string; quoteSymbol?: string
  formatPrice?: (value: number) => string; formatSize?: (value: number) => string; activeLevel?: Active; defaultActiveLevel?: Active; labels?: Partial<Record<string, string>>
  /** Hide the depth readout row (shown by default). */
  hideDepthSummary?: boolean
}>(), { levels: 9, baseSymbol: '', quoteSymbol: 'USD', formatPrice: (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), formatSize: (value: number) => value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 }) })
const emit = defineEmits<{ 'update:activeLevel': [value: Active]; activeLevelChange: [value: Active]; levelSelect: [level: DepthLevel, side: Side] }>()

const defaults: Record<string, string> = {
  label: 'Order book', price: 'Price', size: 'Size', total: 'Total', cumulativeTotal: 'Cumulative total', asksTable: 'Asks · sell orders',
  bidsTable: 'Bids · buy orders', noAsks: 'No asks', noBids: 'No bids', referencePrice: 'Reference price:', spreadUnavailable: 'Spread unavailable',
  crossedBook: 'Crossed book', spread: 'Spread {spread} · {percent}%', bids: 'Bids', asks: 'Asks', visibleDepth: 'Visible depth',
  depthPlaceholder: 'Hover a level to see the cost of filling up to it', average: 'Avg',
}
const t = (key: string, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? defaults[key], values)
const reduce = useReducedMotion()
const instance = getCurrentInstance()
const selectable = computed(() => !!instance?.vnode.props?.onLevelSelect)

const internal = shallowRef<Active>(props.defaultActiveLevel ?? null)
function prepare(levels: readonly Level[], side: Side): DepthLevel[] {
  const prices = new Map<number, number>()
  for (const { price, size } of levels) {
    if (!Number.isFinite(price) || !Number.isFinite(size) || price <= 0 || size <= 0) continue
    prices.set(price, (prices.get(price) ?? 0) + size)
  }
  const limit = Number.isFinite(props.levels) ? Math.max(0, Math.floor(props.levels)) : 9
  let total = 0
  return [...prices].sort(([a], [b]) => side === 'bid' ? b - a : a - b).slice(0, limit).map(([price, size]) => { total += size; return { price, size, total } })
}
const book = computed(() => {
  const bids = prepare(props.bids, 'bid'), asks = prepare(props.asks, 'ask')
  const bidTotal = bids.at(-1)?.total ?? 0, askTotal = asks.at(-1)?.total ?? 0
  const bestBid = bids[0]?.price, bestAsk = asks[0]?.price
  const missing = bestBid == null || bestAsk == null
  return { bids, asks, bidTotal, askTotal, maxTotal: Math.max(bidTotal, askTotal), midpoint: missing ? null : (bestBid + bestAsk) / 2, spread: missing ? null : bestAsk - bestBid }
})
const price = computed(() => props.lastPrice != null && Number.isFinite(props.lastPrice) && props.lastPrice > 0 ? props.lastPrice : book.value.midpoint)
// Resolve the inspected level by price during render; a level that left the book clears the inspection.
const active = computed(() => {
  const raw = props.activeLevel === undefined ? internal.value : props.activeLevel
  if (!raw) return null
  const index = (raw.side === 'bid' ? book.value.bids : book.value.asks).findIndex(level => level.price === raw.price)
  return index >= 0 ? { side: raw.side, index } : null
})
const summary = computed(() => {
  if (!active.value) return null
  const levels = (active.value.side === 'bid' ? book.value.bids : book.value.asks).slice(0, active.value.index + 1)
  const size = levels.reduce((sum, level) => sum + level.size, 0)
  const quote = levels.reduce((sum, level) => sum + level.size * level.price, 0)
  return { side: active.value.side, levels: levels.length, size, quote, averagePrice: size ? quote / size : 0 }
})
function setActive(level: Active) {
  if (props.activeLevel === undefined) internal.value = level
  emit('update:activeLevel', level); emit('activeLevelChange', level)
}
const sides = computed(() => [
  { side: 'ask' as const, rows: [...book.value.asks].reverse(), name: t('asksTable'), empty: t('noAsks') },
  { side: 'bid' as const, rows: book.value.bids, name: t('bidsTable'), empty: t('noBids') },
])
const total = computed(() => book.value.bidTotal + book.value.askTotal)
const ratio = computed(() => total.value ? book.value.bidTotal / total.value : 0.5)
const spreadText = computed(() => book.value.spread == null || book.value.midpoint == null ? t('spreadUnavailable')
  : book.value.spread < 0 ? t('crossedBook') : t('spread', { spread: props.formatPrice(book.value.spread), percent: (book.value.spread / book.value.midpoint * 100).toFixed(3) }))
</script>

<template>
  <section class="be-ob" data-slot="order-book" :aria-label="label ?? t('label')">
    <div class="head" aria-hidden="true">
      <span class="left">{{ t('price') }}{{ quoteSymbol && ` (${quoteSymbol})` }}</span>
      <span class="right">{{ t('size') }}{{ baseSymbol && ` (${baseSymbol})` }}</span>
      <span class="right">{{ t('total') }}</span>
    </div>
    <template v-for="(group, position) in sides" :key="group.side">
      <div v-if="position === 1" class="spread">
        <span class="last"><span class="sr">{{ t('referencePrice') }} </span>{{ price == null ? '—' : formatPrice(price) }}</span>
        <span class="gap">{{ spreadText }}</span>
      </div>
      <table :aria-label="group.name">
        <thead class="sr"><tr><th scope="col">{{ t('price') }} {{ quoteSymbol }}</th><th scope="col">{{ t('size') }} {{ baseSymbol }}</th><th scope="col">{{ t('cumulativeTotal') }} {{ baseSymbol }}</th></tr></thead>
        <tbody @pointerleave="setActive(null)">
          <tr v-if="group.rows.length === 0"><td colspan="3" class="none">{{ group.empty }}</td></tr>
          <OrderBookDepthRow v-for="(row, index) in group.rows" :key="row.price" :row="row" :side="group.side" :in-range="active?.side === group.side && (group.side === 'ask' ? group.rows.length - 1 - index : index) <= active.index"
            :fraction="book.maxTotal ? row.total / book.maxTotal : 0" :entrance-index="group.side === 'ask' ? group.rows.length - 1 - index : index" :format-price="formatPrice" :format-size="formatSize"
            :reduce="!!reduce" :selectable="selectable" @inspect="setActive($event ? { side: group.side, price: row.price } : null)" @select="emit('levelSelect', row, group.side)" />
        </tbody>
      </table>
    </template>
    <p v-if="!hideDepthSummary" class="summary" aria-live="polite">
      <span v-if="!summary" class="placeholder">{{ t('depthPlaceholder') }}</span>
      <slot v-else name="summary" :summary="summary">
        <span>{{ t('average') }} <span class="fg">{{ formatPrice(summary.averagePrice) }}</span></span>
        <span><span class="fg">{{ formatSize(summary.size) }}{{ baseSymbol && ` ${baseSymbol}` }}</span> · {{ formatPrice(summary.quote) }}{{ quoteSymbol && ` ${quoteSymbol}` }}</span>
      </slot>
    </p>
    <div class="balance">
      <div class="labels">
        <span class="bid-text">{{ t('bids') }} {{ total ? `${(ratio * 100).toFixed(1)}%` : '—' }}</span>
        <span class="muted">{{ t('visibleDepth') }}</span>
        <span class="ask-text">{{ t('asks') }} {{ total ? `${((1 - ratio) * 100).toFixed(1)}%` : '—' }}</span>
      </div>
      <div class="track" aria-hidden="true"><motion.div tabindex="-1" class="meter" :initial="false" :animate="{ transform: `scaleX(${ratio})` }" :transition="reduce ? { duration: 0 } : panelSpring" /></div>
    </div>
  </section>
</template>

<style scoped>
.be-ob { box-sizing: border-box; width: 100%; max-width: 560px; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 16px; background: var(--beui-background); color: var(--beui-foreground); font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 12px; line-height: 16px; font-variant-numeric: tabular-nums; }
.head { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 12px 0; font-size: 10px; line-height: 16px; text-transform: uppercase; letter-spacing: .05em; color: var(--beui-muted-foreground); }
.head span { padding: 0 16px; }
.right { text-align: right; }
.be-ob table { display: table; width: 100%; margin: 0; table-layout: fixed; border-collapse: separate; border-spacing: 0; border: 0; }
.be-ob thead.sr { display: table-header-group; }
.sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.none { padding: 24px 16px; text-align: center; color: var(--beui-muted-foreground); border: 0; background: transparent; }
.spread { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 16px; margin: 4px 0; padding: 12px 16px; border-block: 1px solid var(--beui-border); background: color-mix(in srgb, var(--beui-muted) 40%, transparent); }
.last { font-size: 16px; line-height: 24px; font-weight: 500; letter-spacing: -.025em; }
.gap { font-size: 10px; color: var(--beui-muted-foreground); }
.summary { font-size: 12px; line-height: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 16px; min-height: 40px; margin: 0; padding: 8px 16px; border-top: 1px solid var(--beui-border); color: var(--beui-muted-foreground); }
.placeholder { font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif); }
.fg { color: var(--beui-foreground); }
.balance { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--beui-border); }
.labels { display: flex; justify-content: space-between; font-size: 10px; }
.bid-text { color: var(--ob-bid); }
.ask-text { color: var(--ob-ask); }
.muted { color: var(--beui-muted-foreground); }
.track { position: relative; height: 4px; overflow: hidden; border-radius: 9999px; background: rgb(244 63 94 / .25); }
.meter { position: absolute; inset: 0; transform-origin: left; background: rgb(16 185 129 / .6); }
</style>

<style>
.be-ob { --ob-ask: #e11d48; --ob-bid: #047857; }
:where(.dark, [data-beui-theme="dark"]) .be-ob { --ob-ask: #fb7185; --ob-bid: #34d399; }
</style>

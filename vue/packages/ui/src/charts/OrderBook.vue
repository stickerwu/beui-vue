<script setup lang="ts">
import { computed, shallowRef } from 'vue'

interface Level { price: number; size: number }
interface DepthLevel extends Level { total: number }
type Side = 'bid' | 'ask'
type Active = { side: Side; price: number } | null
const props = withDefaults(defineProps<{
  bids: readonly Level[]; asks: readonly Level[]; levels?: number; lastPrice?: number; label?: string; baseSymbol?: string; quoteSymbol?: string
  formatPrice?: (value: number) => string; formatSize?: (value: number) => string; activeLevel?: Active; defaultActiveLevel?: Active; labels?: Partial<Record<string, string>>
}>(), { levels: 9, formatPrice: (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), formatSize: (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 4 }) })
const emit = defineEmits<{ 'update:activeLevel': [value: Active]; activeLevelChange: [value: Active]; levelSelect: [level: DepthLevel, side: Side] }>()
const internal = shallowRef<Active>(props.defaultActiveLevel ?? null)
const active = computed(() => props.activeLevel === undefined ? internal.value : props.activeLevel)
function prepare(levels: readonly Level[], side: Side) {
  const prices = new Map<number, number>()
  for (const { price, size } of levels) {
    if (Number.isFinite(price) && Number.isFinite(size) && price > 0 && size > 0) prices.set(price, (prices.get(price) ?? 0) + size)
  }
  let total = 0
  return [...prices].sort(([left], [right]) => side === 'bid' ? right - left : left - right)
    .slice(0, Number.isFinite(props.levels) ? Math.max(0, Math.floor(props.levels)) : 9).map(([price, size]) => {
      total += size
      return { side, price, size, total }
    })
}
const book = computed(() => ({ bid: prepare(props.bids, 'bid'), ask: prepare(props.asks, 'ask') }))
const maxDepth = computed(() => Math.max(1e-12, book.value.ask.at(-1)?.total ?? 0, book.value.bid.at(-1)?.total ?? 0))
const midpoint = computed(() => {
  const bid = book.value.bid[0]?.price, ask = book.value.ask[0]?.price
  return bid !== undefined && ask !== undefined ? (bid + ask) / 2 : undefined
})
const spread = computed(() => midpoint.value === undefined ? undefined : book.value.ask[0].price - book.value.bid[0].price)
const last = computed(() => props.lastPrice ?? midpoint.value)
const groups = computed(() => [[...book.value.ask].reverse(), book.value.bid])
const summary = computed(() => {
  const value = active.value
  if (!value) return null
  const entries = book.value[value.side]
  const index = entries.findIndex(entry => entry.price === value.price)
  if (index < 0) return null
  const depth = entries.slice(0, index + 1)
  const size = depth[index].total
  const quote = depth.reduce((total, level) => total + level.price * level.size, 0)
  return { side: value.side, levels: depth.length, size, quote, averagePrice: quote / size }
})
function inspect(next: Active) {
  if (active.value?.price === next?.price && active.value?.side === next?.side) return
  if (props.activeLevel === undefined) internal.value = next
  emit('update:activeLevel', next); emit('activeLevelChange', next)
}
function highlighted(level: Level, side: Side) {
  const selected = active.value
  return summary.value && selected?.side === side && (side === 'bid' ? level.price >= selected.price : level.price <= selected.price)
}
</script>

<template>
  <section class="order-book" data-slot="order-book" :aria-label="label ?? labels?.label ?? 'Order book'">
    <table><thead><tr><th scope="col">{{ labels?.price ?? 'Price' }} {{ quoteSymbol }}</th><th scope="col">{{ labels?.size ?? 'Size' }} {{ baseSymbol }}</th><th scope="col">{{ labels?.total ?? 'Total' }}</th></tr></thead>
      <tbody v-for="(group, position) in groups" :key="position">
        <tr v-if="position === 1" class="spread"><td colspan="3"><strong>{{ last !== undefined ? formatPrice(last) : '—' }}</strong> <small v-if="spread !== undefined">{{ labels?.spread ?? 'Spread' }} {{ formatPrice(spread) }}</small></td></tr>
        <tr v-for="level in group" :key="level.price" class="depth-row" :data-side="level.side" :data-active="Boolean(highlighted(level, level.side))"
          :style="{ '--depth': `${level.total / maxDepth * 100}%` }" @pointerenter="$event.pointerType !== 'touch' && inspect({ price: level.price, side: level.side })" @pointerleave="inspect(null)">
          <td><button type="button" :aria-label="`${level.side} ${formatPrice(level.price)}`" @focus="inspect({ price: level.price, side: level.side })" @blur="inspect(null)" @keydown.esc="inspect(null)" @click="emit('levelSelect', level, level.side)">{{ formatPrice(level.price) }}</button></td>
          <td>{{ formatSize(level.size) }}</td><td>{{ formatSize(level.total) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="summary" class="summary"><slot name="summary" :summary="summary">{{ summary.levels }} {{ summary.side }} levels · {{ formatSize(summary.size) }} {{ baseSymbol }} · {{ labels?.averagePrice ?? 'Average' }} {{ formatPrice(summary.averagePrice) }}</slot></div>
  </section>
</template>

<style scoped>
.order-book { width: 100%; max-width: 30rem; font: 12px/1.45 system-ui; font-variant-numeric: tabular-nums; }
.order-book table { display: table; width: 100%; margin: 0; table-layout: fixed; border-collapse: collapse; }
.order-book th, .order-book td { text-align: right; padding: 2px 8px; border: 0; background: transparent; }
.order-book th:first-child, .order-book td:first-child { text-align: left; }
.order-book tr { border: 0; background: transparent; }
.order-book th { font-size: 11px; opacity: .7; }
.depth-row { --tone: #059669; --strength: 12%; }
.depth-row[data-side='ask'] { --tone: #e11d48; }
.depth-row[data-active='true'] { --strength: 26%; }
.order-book .depth-row { background-image: linear-gradient(to left, color-mix(in srgb, var(--tone) var(--strength), transparent) var(--depth), transparent var(--depth)); }
.depth-row button { display: block; background: transparent; border: 0; font: inherit; font-weight: 600; padding: 3px 0; color: var(--tone); cursor: pointer; }
.order-book .spread td { padding-block: 8px; }
.spread strong { font-size: 17px; }.spread small { margin-left: 8px; opacity: .7; }
.summary { margin-top: 8px; }
</style>

<script setup lang="ts">
import OrderBookBalance from './OrderBookBalance.vue'
import OrderBookHeader from './OrderBookHeader.vue'
import OrderBookSide from './OrderBookSide.vue'
import OrderBookSpread from './OrderBookSpread.vue'
import { provideOrderBook, useOrderBookModel, type OrderBookEmit, type OrderBookProps } from './order-book-context'

defineSlots<{
  /** Compose `OrderBookHeader`, `OrderBookSide`, `OrderBookSpread`, `OrderBookDepthSummary` and `OrderBookBalance`; omit it for the default ladder. */
  default?(): unknown
}>()
const props = withDefaults(defineProps<OrderBookProps>(), {
  levels: 9, baseSymbol: '', quoteSymbol: 'USD',
  formatPrice: (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  formatSize: (value: number) => value.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 }),
})
const emit = defineEmits<{
  'update:activeLevel': [value: OrderBookProps['activeLevel']]
  activeLevelChange: [value: OrderBookProps['activeLevel']]
  /** Fired when a price is chosen; listening makes every price a button. */
  levelSelect: [level: { price: number; size: number; total: number }, side: 'bid' | 'ask']
}>()
const model = useOrderBookModel(props, emit as OrderBookEmit)
provideOrderBook(model)
const { label } = model
</script>

<template>
  <section class="be-ob" data-slot="order-book" :aria-label="label">
    <slot>
      <OrderBookHeader />
      <OrderBookSide side="ask" />
      <OrderBookSpread />
      <OrderBookSide side="bid" />
      <OrderBookBalance />
    </slot>
  </section>
</template>

<style scoped>
.be-ob { box-sizing: border-box; width: 100%; max-width: 560px; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 16px; background: var(--beui-background); color: var(--beui-foreground); font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 12px; line-height: calc(4 / 3); font-variant-numeric: tabular-nums; }
</style>

<style>
.be-ob { --ob-ask: #e11d48; --ob-bid: #047857; }
:where(.dark, [data-beui-theme="dark"]) .be-ob { --ob-ask: #fb7185; --ob-bid: #34d399; }
</style>

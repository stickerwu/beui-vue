<script setup lang="ts">
import { computed } from 'vue'
import OrderBookDepthRow from './OrderBookDepthRow.vue'
import { useOrderBook, type OrderBookSideName } from './order-book-context'

const { side } = defineProps<{
  /** Which half of the book to list: asks run best-last, bids best-first. */
  side: OrderBookSideName
}>()
const { book, formatPrice, formatSize, reduce, selectable, baseSymbol, quoteSymbol, active, setActive, selectLevel, t } = useOrderBook()
const rows = computed(() => side === 'ask' ? [...book.value.asks].reverse() : book.value.bids)
const depthIndex = (index: number) => side === 'ask' ? rows.value.length - 1 - index : index
</script>

<template>
  <table data-slot="order-book-side" :aria-label="side === 'ask' ? t('asksTable') : t('bidsTable')">
    <thead class="sr"><tr><th scope="col">{{ t('price') }} {{ quoteSymbol }}</th><th scope="col">{{ t('size') }} {{ baseSymbol }}</th><th scope="col">{{ t('cumulativeTotal') }} {{ baseSymbol }}</th></tr></thead>
    <tbody @pointerleave="setActive(null)">
      <tr v-if="rows.length === 0"><td colspan="3" class="none">{{ side === 'ask' ? t('noAsks') : t('noBids') }}</td></tr>
      <OrderBookDepthRow v-for="(row, index) in rows" :key="row.price" :row="row" :side="side" :in-range="active?.side === side && depthIndex(index) <= active.index"
        :fraction="book.maxTotal ? row.total / book.maxTotal : 0" :entrance-index="depthIndex(index)" :format-price="formatPrice" :format-size="formatSize"
        :reduce="!!reduce" :selectable="selectable" @inspect="setActive($event ? { side, price: row.price } : null)" @select="selectLevel(row, side)" />
    </tbody>
  </table>
</template>

<style scoped>
table { display: table; width: 100%; margin: 0; table-layout: fixed; border-collapse: separate; border-spacing: 0; border: 0; }
thead.sr { display: table-header-group; }
.sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.none { padding: 24px 16px; text-align: center; color: var(--beui-muted-foreground); border: 0; background: transparent; }
</style>

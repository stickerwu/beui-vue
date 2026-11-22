<script setup lang="ts">
/** Totals the inspected levels: the hovered or focused level and every better level on its side, as the cost of filling up to that price. */
import { useOrderBook, type OrderBookDepthSummaryData } from './order-book-context'

defineSlots<{
  /** Custom readout for the inspected levels. */
  default?(props: { summary: OrderBookDepthSummaryData }): unknown
  /** Shown while no level is inspected. */
  placeholder?(): unknown
}>()
const { summary, formatPrice, formatSize, baseSymbol, quoteSymbol, t } = useOrderBook()
</script>

<template>
  <p class="summary" data-slot="order-book-depth-summary" aria-live="polite">
    <span v-if="!summary" class="placeholder"><slot name="placeholder">{{ t('depthPlaceholder') }}</slot></span>
    <slot v-else :summary="summary">
      <span>{{ t('average') }} <span class="fg">{{ formatPrice(summary.averagePrice) }}</span></span>
      <span><span class="fg">{{ formatSize(summary.size) }}{{ baseSymbol && ` ${baseSymbol}` }}</span> · {{ formatPrice(summary.quote) }}{{ quoteSymbol && ` ${quoteSymbol}` }}</span>
    </slot>
  </p>
</template>

<style scoped>
.summary { font-size: 12px; line-height: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 16px; min-height: 40px; margin: 0; padding: 8px 16px; border-top: 1px solid var(--beui-border); color: var(--beui-muted-foreground); }
.placeholder { font-family: var(--font-geist, var(--font-sans, ui-sans-serif, system-ui, sans-serif)); }
.fg { color: var(--beui-foreground); }
</style>

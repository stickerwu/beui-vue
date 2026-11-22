<script setup lang="ts">
import { computed } from 'vue'
import { useOrderBook } from './order-book-context'

const { price, book, formatPrice, t } = useOrderBook()
const spreadText = computed(() => book.value.spread == null || book.value.midpoint == null ? t('spreadUnavailable')
  : book.value.spread < 0 ? t('crossedBook') : t('spread', { spread: formatPrice(book.value.spread), percent: (book.value.spread / book.value.midpoint * 100).toFixed(3) }))
</script>

<template>
  <div class="spread" data-slot="order-book-spread">
    <span class="last"><span class="sr">{{ t('referencePrice') }} </span>{{ price == null ? '—' : formatPrice(price) }}</span>
    <span class="gap">{{ spreadText }}</span>
  </div>
</template>

<style scoped>
.spread { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 16px; margin: 4px 0; padding: 12px 16px; border-block: 1px solid var(--beui-border); background: color-mix(in srgb, var(--beui-muted) 40%, transparent); }
.last { font-size: 16px; line-height: 24px; font-weight: 500; letter-spacing: -.025em; }
.gap { font-size: 10px; color: var(--beui-muted-foreground); }
.sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
</style>

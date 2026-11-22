<script setup lang="ts">
import { useOrderBook } from './order-book-context'

const { baseSymbol, quoteSymbol, t } = useOrderBook()
</script>

<template>
  <div class="head" data-slot="order-book-header" aria-hidden="true">
    <span class="left">{{ t('price') }}{{ quoteSymbol && ` (${quoteSymbol})` }}</span>
    <span class="right">{{ t('size') }}{{ baseSymbol && ` (${baseSymbol})` }}</span>
    <span class="right">{{ t('total') }}</span>
  </div>
</template>

<style scoped>
.head { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 12px 0; font-size: 10px; line-height: calc(4 / 3); text-transform: uppercase; letter-spacing: .05em; color: var(--beui-muted-foreground); }
.head span { padding: 0 16px; }
.right { text-align: right; }
</style>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { OrderBook } from 'beui-vue'

const bids = Array.from({ length: 6 }, (_, index) => ({ price: 184.8 - index * .1, size: (index * 3 + 5) / 10 }))
const asks = Array.from({ length: 6 }, (_, index) => ({ price: 185 + index * .1, size: (index * 2 + 4) / 10 }))
const chosen = shallowRef('')
</script>

<template>
  <div style="width: min(26rem, 100%)"><OrderBook label="Order depth" base-symbol="SOL" quote-symbol="USD" :bids="bids" :asks="asks" :levels="6"
    @level-select="(level, side) => chosen = `${side} at $${level.price.toFixed(2)}`" />
    <output>{{ chosen }}</output>
  </div>
</template>

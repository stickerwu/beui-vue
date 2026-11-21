<script setup lang="ts">
import { PredictionMarket, type PredictionMarketOrderValue } from 'beui-vue'
import { shallowRef } from 'vue'

const outcomes = [
  { id: 'yes', label: 'Yes', price: 0.167 },
  { id: 'no', label: 'No', price: 0.834 },
]
const order = shallowRef<PredictionMarketOrderValue>({ mode: 'buy', outcomeId: 'yes', amount: '115' })
</script>

<template>
  <div class="ticket-demo">
    <PredictionMarket
      :outcomes="outcomes" :value="order" :balance="500" :positions="{ yes: 125, no: 48 }" :quick-amounts="[1, 5, 10, 100]"
      @value-change="order = $event"
    />
  </div>
</template>

<style scoped>
.ticket-demo { display: flex; width: 100%; align-items: center; justify-content: center; }
</style>

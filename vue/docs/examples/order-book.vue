<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { OrderBook } from 'beui-vue'

const tick = ref(0), playing = ref(true), chosen = ref<number | null>(null)
const askSizes = [284,574,363,278,1800,2200,1100,1200,782], bidSizes = [194,543,314,592,715,744,789,735,1100]
function side(sizes: number[], direction: number) {
  return sizes.map((size, index) => {
    const phase = (index + Number(direction === 1)) % 3
    const last = tick.value - (tick.value + phase) % 3
    return { price: Number((245.85 + direction * (index + 1) * .15).toFixed(2)),
      size: last <= 0 ? size : Math.round(size * (1 + Math.sin(last * 1.3 + index * 2.1 + direction) * .32)) }
  })
}
const book = computed(() => ({ asks: side(askSizes, 1), bids: side(bidSizes, -1) }))
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { if (playing.value && !document.hidden) tick.value++ }, 950) })
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="chart-demo" style="max-width:520px"><header><strong>SOL / USD <small class="sim">Simulated</small></strong><div><button type="button" @click="playing = !playing">{{ playing ? 'Pause' : 'Resume' }}</button><button type="button" @click="playing = false; tick++">Step</button></div></header>
    <OrderBook label="Simulated SOL / USD order book" base-symbol="SOL" quote-symbol="USD" v-bind="book" @level-select="level => chosen = level.price" />
    <p aria-live="polite">{{ chosen === null ? 'Click a price to use it, for example in an order ticket.' : `Selected ${chosen.toFixed(2)} USD` }}</p>
  </div>
</template>
<style scoped src="./chart-demo.css"></style>

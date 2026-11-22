<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ButtonBase, OrderBook, OrderBookBalance, OrderBookDepthSummary, OrderBookHeader, OrderBookSide, OrderBookSpread } from 'beui-vue'

const tick = ref(0), playing = ref(true), chosen = ref<number | null>(null)
// Illustrative snapshots only. Replace with your exchange's aggregated price levels.
const askSizes = [284, 574, 363, 278, 1800, 2200, 1100, 1200, 782], bidSizes = [194, 543, 314, 592, 715, 744, 789, 735, 1100]
function side(sizes: number[], direction: number) {
  return sizes.map((size, index) => {
    // Update one third of the levels per beat; unchanged quotes keep their identity.
    const phase = (index + (direction === 1 ? 1 : 0)) % 3
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
  <div class="ob-demo">
    <div class="top">
      <div class="pair">SOL / USD<span class="sim">Simulated</span></div>
      <div class="actions">
        <ButtonBase variant="ghost" size="sm" @click="playing = !playing">{{ playing ? 'Pause' : 'Resume' }}</ButtonBase>
        <ButtonBase variant="ghost" size="sm" @click="playing = false; tick++">Step</ButtonBase>
      </div>
    </div>
    <OrderBook label="Simulated SOL / USD order book" base-symbol="SOL" quote-symbol="USD" v-bind="book" @level-select="level => chosen = level.price">
      <OrderBookHeader />
      <OrderBookSide side="ask" />
      <OrderBookSpread />
      <OrderBookSide side="bid" />
      <OrderBookDepthSummary />
      <OrderBookBalance />
    </OrderBook>
    <p class="hint" aria-live="polite">{{ chosen === null ? 'Click a price to use it, for example in an order ticket.' : `Selected ${chosen.toFixed(2)} USD` }}</p>
  </div>
</template>

<style scoped>
.ob-demo { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 520px; }
.top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 0 4px; }
.pair { display: flex; align-items: center; gap: 8px; font-size: 14px; line-height: 20px; font-weight: 500; }
.sim { padding: 2px 6px; border: 1px solid var(--beui-border); border-radius: 4px; font-size: 9px; line-height: 1.42857; font-weight: 400; text-transform: uppercase; letter-spacing: .05em; color: var(--beui-muted-foreground); }
.actions { display: flex; align-items: center; gap: 8px; }
.hint { margin: 0; padding: 0 4px; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
</style>

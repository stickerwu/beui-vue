<script setup lang="ts">
/** Balance of the displayed depth, not the entire exchange order book. */
import { computed } from 'vue'
import { motion } from 'motion-v'
import { panelSpring } from '../core/motion'
import { useOrderBook } from './order-book-context'

const { book, reduce, t } = useOrderBook()
const total = computed(() => book.value.bidTotal + book.value.askTotal)
const ratio = computed(() => total.value ? book.value.bidTotal / total.value : 0.5)
</script>

<template>
  <div class="balance" data-slot="order-book-balance">
    <div class="labels">
      <span class="bid-text">{{ t('bids') }} {{ total ? `${(ratio * 100).toFixed(1)}%` : '—' }}</span>
      <span class="muted">{{ t('visibleDepth') }}</span>
      <span class="ask-text">{{ t('asks') }} {{ total ? `${((1 - ratio) * 100).toFixed(1)}%` : '—' }}</span>
    </div>
    <div class="track" aria-hidden="true"><motion.div tabindex="-1" class="meter" :initial="false" :animate="{ transform: `scaleX(${ratio})` }" :transition="reduce ? { duration: 0 } : panelSpring" /></div>
  </div>
</template>

<style scoped>
.balance { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--beui-border); }
.labels { display: flex; justify-content: space-between; font-size: 10px; }
.bid-text { color: var(--ob-bid); }
.ask-text { color: var(--ob-ask); }
.muted { color: var(--beui-muted-foreground); }
.track { position: relative; height: 4px; overflow: hidden; border-radius: 9999px; background: rgb(244 63 94 / .25); }
.meter { position: absolute; inset: 0; transform-origin: left; background: rgb(16 185 129 / .6); }
</style>

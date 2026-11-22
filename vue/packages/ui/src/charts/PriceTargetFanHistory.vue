<script setup lang="ts">
import { motion } from 'motion-v'
import { easeOut } from '../core/motion'
import { usePriceTargetFan } from './price-target-fan-context'

const { hist, history, scrub, setScrub, setActive, tooltipId, fmt, geo, reduce, t } = usePriceTargetFan()
function onKey(event: KeyboardEvent) {
  const index = scrub.value ?? hist.value.length - 1
  if (event.key === 'Escape') { event.preventDefault(); setActive(null) }
  else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    setScrub(event.key === 'Home' ? 0 : event.key === 'End' ? hist.value.length - 1 : Math.max(0, Math.min(hist.value.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1))))
  }
}
</script>

<template>
  <g data-slot="price-target-fan-history">
    <g v-if="hist.length" class="history" role="slider" tabindex="0" :aria-label="t('history')" aria-valuemin="0" :aria-valuemax="hist.length - 1"
      :aria-valuenow="scrub ?? hist.length - 1" :aria-valuetext="`${history[scrub ?? hist.length - 1].date}: ${fmt(hist[scrub ?? hist.length - 1])}`" :aria-describedby="scrub !== null ? tooltipId : undefined"
      @focus="setScrub(hist.length - 1)" @blur="setActive(null)" @keydown="onKey">
      <!-- history draws itself to now -->
      <motion.path data-price-history="" tabindex="-1" :d="geo.line" fill="none" stroke="var(--beui-foreground)" stroke-width="1.5" stroke-linecap="round" :initial="{ pathLength: reduce ? 1 : 0 }" :animate="{ pathLength: 1 }" :transition="reduce ? { duration: 0 } : { duration: 0.9, ease: easeOut }" />
    </g>
  </g>
</template>

<style scoped>
.history { outline: none; }
.history:focus-visible { outline: none; }
</style>

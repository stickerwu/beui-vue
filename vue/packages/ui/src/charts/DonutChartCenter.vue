<script setup lang="ts">
/* The value rolls digit by digit (up when it grows, down when it shrinks) in a stable container, and the caption
 * slides through a clipped line, so moving between segments reads as one readout updating rather than a replaced
 * block. Reduced motion: both swap with a short fade. */
import { computed, shallowRef, watch } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { easeOut } from '../core/motion'
import DigitSwap from '../numeric/DigitSwap.vue'
import { useDonutChart, type DonutPlacedSegment } from './donut-context'

defineSlots<{
  /** Custom content for the hole. Receives the focused segment, or null when nothing is focused, and the total. */
  default?(props: { segment: DonutPlacedSegment | null; total: number }): unknown
  /** Caption under the total when nothing is focused. */
  totalLabel?(): unknown
}>()
defineProps<{
  /** Caption under the total when nothing is focused. */
  totalLabel?: string
}>()
const { placed, active, total, formatValue, reduce, t } = useDonutChart()
const segment = computed(() => placed.value.find(item => item.id === active.value) ?? null)
const value = computed(() => segment.value?.value ?? total.value)
// Roll digits in the direction the value moved.
const direction = shallowRef<'up' | 'down'>('up')
watch(value, (next, prev) => { direction.value = next > prev ? 'up' : 'down' }, { flush: 'sync' })
</script>

<template>
  <div v-if="$slots.default" aria-live="polite" class="center" data-slot="donut-chart-center"><slot :segment="segment" :total="total" /></div>
  <div v-else aria-live="polite" class="center" data-slot="donut-chart-center">
    <p class="amount"><DigitSwap :value="formatValue(value)" :direction="direction" /></p>
    <div class="caption-clip">
      <AnimatePresence :initial="false" mode="popLayout">
        <motion.p :key="segment?.id ?? 'total'" tabindex="-1" :initial="reduce ? { opacity: 0 } : { opacity: 0, y: '100%' }" :animate="{ opacity: 1, y: '0%' }"
          :exit="reduce ? { opacity: 0 } : { opacity: 0, y: '-100%' }" :transition="{ duration: reduce ? 0.12 : 0.22, ease: easeOut }" class="caption">
          <template v-if="segment">
            <span aria-hidden="true" class="caption-dot" :style="{ backgroundColor: segment.color }" />
            <span class="caption-text">{{ segment.name }} · {{ (segment.share * 100).toFixed(1) }}%</span>
          </template>
          <slot v-else name="totalLabel">{{ totalLabel ?? t('total') }}</slot>
        </motion.p>
      </AnimatePresence>
    </div>
  </div>
</template>

<style scoped>
.center { position: relative; max-width: 56%; }
.amount { margin: 0; font-size: 24px; line-height: 32px; font-weight: 500; letter-spacing: -0.025em; font-variant-numeric: tabular-nums; }
.caption-clip { position: relative; margin-top: 4px; height: 16px; overflow: hidden; }
.caption { margin: 0; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.caption-dot { width: 8px; height: 8px; flex: none; border-radius: 9999px; }
.caption-text { overflow: hidden; text-overflow: ellipsis; }
</style>

<script setup lang="ts">
import NumberTicker from '../numeric/NumberTicker.vue'
import { ptfInk, usePriceTargetFan } from './price-target-fan-context'

defineSlots<{
  /** Replace the default price, move and target name. */
  default?(): unknown
}>()
const { head, headPct, t } = usePriceTargetFan()
</script>

<template>
  <div class="head" data-slot="price-target-fan-header">
    <slot>
      <div class="head-line">
        <NumberTicker :value="Math.round(head.price * 100)" :format="v => (v / 100).toFixed(2)" prefix="$" :duration="0.5" class-name="price" />
        <span class="pct" :style="{ color: ptfInk(head.color ?? (headPct >= 0 ? 'var(--ptf-success)' : 'var(--ptf-warning)')) }">
          <NumberTicker :value="Math.round(Math.abs(headPct) * 10)" :format="v => (v / 10).toFixed(1)" :prefix="headPct >= 0 ? '+' : '−'" suffix="%" :duration="0.5" />
        </span>
        <span class="name">{{ t('target', { key: head.key }) }}</span>
      </div>
    </slot>
  </div>
</template>

<style scoped>
.head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 4px; padding: 0 4px; }
.head-line { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.head-line :deep(.price) { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 24px; line-height: 32px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -.025em; color: var(--beui-foreground); }
.pct { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 12px; line-height: 16px; font-weight: 500; font-variant-numeric: tabular-nums; }
.name { font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
</style>

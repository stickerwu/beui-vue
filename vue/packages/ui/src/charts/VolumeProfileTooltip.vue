<script setup lang="ts">
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import type { VolumeProfileRow } from './models/volume-profile'
import { useVolumeProfile } from './volume-profile-context'

defineSlots<{
  /** Replaces the default content. Receives the inspected price row. */
  default?(props: { row: VolumeProfileRow }): unknown
}>()
const { side = 'top' } = defineProps<{ side?: 'top' | 'right' | 'bottom' | 'left' }>()
const { rows, active, plot, tooltipId, tooltipOpen, formatPrice, formatVolume, unit, t, setTooltipOpen } = useVolumeProfile()
</script>

<template>
  <ChartTip v-if="rows.length" :id="tooltipId" :anchor="plot" :side="side" :anchor-point="{ x: active ? Math.max(0.1, active.proportion / 2) : 0.5, y: active?.center ?? 0.5 }" :open="tooltipOpen && active !== null" @dismiss="setTooltipOpen(false)">
    <slot v-if="active" :row="active">
      <span class="tip">
        <span class="range"><span class="mono"><NumberTicker :value="active.priceLow" :format="() => formatPrice(active!.priceLow)" :start-on-view="false" :duration="0.2" :stagger="0" /></span><span>–</span><span class="mono"><NumberTicker :value="active.priceHigh" :format="() => formatPrice(active!.priceHigh)" :start-on-view="false" :duration="0.2" :stagger="0" /></span></span>
        <span class="amount"><span class="mono"><NumberTicker :value="active.volume" :format="() => formatVolume(active!.volume)" :start-on-view="false" :duration="0.2" :stagger="0" /></span> {{ unit }}
          <span class="muted">·<span class="mono"><NumberTicker :value="active.share * 100" :format="() => `${(active!.share * 100).toFixed(1)}%`" :start-on-view="false" :duration="0.2" :stagger="0" /></span></span></span>
        <span v-if="active.isPoc || active.inValueArea" class="muted">{{ active.isPoc ? t('poc') : t('inside') }}</span>
      </span>
    </slot>
  </ChartTip>
</template>

<style scoped>
.mono { font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); }
.muted { color: var(--beui-muted-foreground); }
.tip { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.range { display: inline-flex; align-items: center; gap: 4px; font-weight: 500; font-variant-numeric: tabular-nums; }
.amount { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.amount .muted { display: inline-flex; align-items: center; gap: 4px; }
</style>

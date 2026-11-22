<script setup lang="ts">
import { useVolumeProfile } from './volume-profile-context'

const { rows, model, formatPrice, formatVolume, unit, color, pocColor, t } = useVolumeProfile()
</script>

<template>
  <dl v-if="rows.length" class="summary" data-slot="volume-profile-summary">
    <div><dt class="plain">{{ t('totalVolume') }}</dt><dd class="mono strong">{{ t('amount', { volume: formatVolume(model.totalVolume), unit }) }}</dd></div>
    <div><dt><span aria-hidden="true" class="dot" :style="{ backgroundColor: pocColor }" />{{ t('poc') }}</dt><dd class="mono strong">{{ model.poc ? formatPrice(model.poc.price) : '—' }}</dd></div>
    <div v-if="model.valueArea" class="wide"><dt><span aria-hidden="true" class="dot" :style="{ backgroundColor: color }" />{{ t('valueArea', { target: Math.round(model.valueArea.target * 100) }) }}</dt>
      <dd class="mono strong">{{ formatPrice(model.valueArea.priceLow) }} – {{ formatPrice(model.valueArea.priceHigh) }}</dd>
      <dd class="muted">{{ t('shareOfVolume', { share: `${(model.valueArea.share * 100).toFixed(1)}%` }) }}</dd></div>
  </dl>
</template>

<style scoped>
.mono { font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); }
.muted { color: var(--beui-muted-foreground); }
.summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0; padding-top: 16px; border-top: 1px solid var(--beui-border); font-size: 12px; line-height: 16px; }
.summary > div { display: flex; flex-direction: column; gap: 6px; }
.summary .wide { grid-column: span 2; }
@media (min-width: 640px) { .summary { grid-template-columns: repeat(3, minmax(0, 1fr)); } .summary .wide { grid-column: span 1; } }
.summary dt.plain { display: block; gap: normal; }
.summary dt { display: flex; align-items: center; gap: 6px; color: var(--beui-muted-foreground); }
.summary dd { margin: 0; }
.strong { font-weight: 500; font-variant-numeric: tabular-nums; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
</style>

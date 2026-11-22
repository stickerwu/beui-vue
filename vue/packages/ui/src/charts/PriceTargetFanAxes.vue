<script setup lang="ts">
import { computed } from 'vue'
import { PTF_H as H, PTF_PAD as PAD, ptfAxisDate, usePriceTargetFan } from './price-target-fan-context'

const { gridVals, y, geo, dates, history, fadeId, t } = usePriceTargetFan()
// the date axis: history, now, horizon
const axisLabels = computed(() => {
  const list = history.value
  return [
    ...(list.length ? [{ x: geo.value.hx(0), text: dates.value.start ?? ptfAxisDate(list[0].date), anchor: 'start' }] : []),
    ...(list.length > 2 ? [{ x: geo.value.hx(Math.floor(list.length / 2)), text: dates.value.mid ?? ptfAxisDate(list[Math.floor(list.length / 2)].date), anchor: 'middle' }] : []),
    { x: geo.value.nowX, text: t('now'), anchor: 'middle' },
    { x: geo.value.endX, text: dates.value.horizon ?? t('horizon'), anchor: 'middle' },
  ]
})
</script>

<template>
  <g data-slot="price-target-fan-axes">
    <!-- gridlines and the price axis -->
    <g v-for="value in gridVals.out" :key="value">
      <line :x1="PAD.l" :y1="y(value)" :x2="geo.endX" :y2="y(value)" stroke="var(--ptf-border)" stroke-dasharray="2 5" />
      <text class="tick" :x="PAD.l - 8" :y="y(value) + 3" text-anchor="end">{{ value.toFixed(gridVals.decimals) }}</text>
    </g>
    <text v-for="label in axisLabels" :key="label.x" class="axis" :x="label.x" :y="H - 8" :text-anchor="label.anchor">{{ label.text }}</text>
    <!-- the now marker -->
    <line :x1="geo.nowX" :y1="PAD.t" :x2="geo.nowX" :y2="H - PAD.b" :stroke="`url(#${fadeId})`" stroke-width="1" stroke-dasharray="3 3" />
  </g>
</template>

<style scoped>
.tick, .axis { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 9px; fill: var(--beui-muted-foreground); }
.tick { font-variant-numeric: tabular-nums; }
</style>

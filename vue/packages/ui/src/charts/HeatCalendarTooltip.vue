<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { useHeatCalendar, type HeatCalendarCell, type HeatCalendarTooltipData } from './heat-calendar-context'

defineSlots<{
  /** Custom tooltip content for the hovered cell, or the span being previewed. */
  default?(props: { data: HeatCalendarTooltipData }): unknown
}>()
const { gridEl, tooltipId, tip, tooltip, unit, t, formats } = useHeatCalendar()

// dismissed (Escape, or a tap elsewhere) until the tip moves to another cell
const dismissed = shallowRef<HeatCalendarCell | null>(null)
const tipKey = computed(() => tip.value ? `${tip.value.w}-${tip.value.d}` : 'closed')
const open = computed(() => tooltip.value !== null && dismissed.value !== tip.value)
const anchor = computed(() => {
  const at = tip.value
  return at ? gridEl.value?.querySelector<HTMLElement>(`[data-heat-cell="${at.w}-${at.d}"]`) ?? null : null
})
const dismiss = () => { dismissed.value = tip.value }
const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && open.value) dismiss() }
const onDown = (event: PointerEvent) => { if (open.value && event.pointerType === 'touch' && !gridEl.value?.contains(event.target as Node)) dismiss() }
onMounted(() => { document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown, true) })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true) })
</script>

<template>
  <ChartTip :key="tipKey" :id="tooltipId" :open="open" :anchor="anchor" :follow-cursor="false" side="top" @dismiss="dismiss">
    <slot v-if="tooltip" :data="tooltip">
      <span class="tip">
        <span class="count"><NumberTicker :value="tooltip.days > 1 ? tooltip.total : tooltip.count" :duration="0.35" :start-on-view="false" />{{ unit }}</span>
        <span class="muted">{{ tooltip.days > 1 ? t('range', { start: formats.range.format(tooltip.startDate), end: formats.range.format(tooltip.endDate) }) : formats.day.format(tooltip.date) }}</span>
        <span v-if="tooltip.days > 1" class="muted">{{ t('days', { days: tooltip.days }) }}</span>
      </span>
    </slot>
  </ChartTip>
</template>

<!-- Tooltip content is teleported to the body, so its rules cannot be scoped. -->
<style>
.chart-tip .tip { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; text-align: left; line-height: calc(4 / 3); }
.chart-tip .tip .count { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.chart-tip .tip .muted { color: var(--beui-muted-foreground); }
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { ink, useReturnsCalendar, type ReturnsCalendarCell, type ReturnsCalendarTooltipData } from './returns-calendar-context'

defineSlots<{
  /** Custom tooltip content for the hovered month, year, or the span being previewed. */
  default?(props: { data: ReturnsCalendarTooltipData }): unknown
}>()
const { gridEl, tooltipId, tip, tipValue, tipLabel, tipNote } = useReturnsCalendar()

// dismissed (Escape, or a tap elsewhere) until the tip moves to another cell
const dismissed = shallowRef<ReturnsCalendarCell | null>(null)
const tipKey = computed(() => tip.value ? `${tip.value.y}-${tip.value.m}` : 'closed')
const open = computed(() => tip.value !== null && dismissed.value !== tip.value)
const anchor = computed(() => {
  const at = tip.value
  return at ? gridEl.value?.querySelector<HTMLElement>(`[data-return-cell="${at.y}-${at.m}"]`) ?? null : null
})
const data = computed<ReturnsCalendarTooltipData>(() => ({ label: tipLabel.value, value: tipValue.value, note: tipNote.value }))
const dismiss = () => { dismissed.value = tip.value }
const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && open.value) dismiss() }
const onDown = (event: PointerEvent) => { if (open.value && event.pointerType === 'touch' && !gridEl.value?.contains(event.target as Node)) dismiss() }
onMounted(() => { document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown, true) })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true) })
</script>

<template>
  <ChartTip :key="tipKey" :id="tooltipId" :open="open" :anchor="anchor" :follow-cursor="false" side="top" @dismiss="dismiss">
    <slot :data="data">
      <span class="returns-tip">
        <span class="muted">{{ tipLabel }}</span>
        <span class="value" :style="{ color: ink(tipValue) }">
          <NumberTicker :value="Math.round(Math.abs(tipValue) * 10)" :format="v => (v / 10).toFixed(1)" :prefix="tipValue >= 0 ? '+' : '−'" suffix="%" :duration="0.35" :start-on-view="false" />
        </span>
        <span v-if="tipNote" class="muted">{{ tipNote }}</span>
      </span>
    </slot>
  </ChartTip>
</template>

<!-- Tooltip content is teleported to the body, so its rules cannot be scoped. -->
<style>
.chart-tip .returns-tip { display: flex; align-items: center; gap: 6px; text-align: left; line-height: calc(4 / 3); white-space: nowrap; }
.chart-tip .returns-tip .muted { color: var(--beui-muted-foreground); }
.chart-tip .returns-tip .value { display: inline-flex; align-items: center; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
</style>

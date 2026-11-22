<script setup lang="ts">
import { computed } from 'vue'
import NumberTicker from '../numeric/NumberTicker.vue'
import { useBarChart, type BarChartTooltipData, type BarChartTooltipRow } from './bar-chart-context'
import ChartTip from './ChartTip.vue'

defineSlots<{
  /** Replaces the default content. Receives the inspected category, its index, its rows and their total. */
  default?(props: BarChartTooltipData): unknown
}>()
const { side = 'top' } = defineProps<{ side?: 'top' | 'right' | 'bottom' | 'left' }>()
/**
 * Follows the pointer like the other beUI charts' readouts. Keyboard inspection, which has no pointer, anchors at
 * the end of the category's longest bar instead.
 */
const { t, formatValue, data, visibleRows, order, totals, domain, grouped, vertical, activeIndex, open, plot, tooltipId, setOpen } = useBarChart()
const rows = computed<BarChartTooltipRow[]>(() => visibleRows.value.map(row => ({ id: row.id, name: row.name, color: row.color, value: row.values[activeIndex.value] ?? null })))
const category = computed(() => data.value.categories[activeIndex.value])
const total = computed(() => totals.value[activeIndex.value] ?? 0)
const anchorPoint = computed(() => {
  const reach = grouped.value ? Math.max(0, ...rows.value.map(row => row.value ?? 0)) : total.value
  const along = Math.min(1, reach / (domain.value.max || 1))
  const across = (Math.max(order.value.indexOf(activeIndex.value), 0) + 0.5) / Math.max(data.value.categories.length, 1)
  return vertical.value ? { x: across, y: 1 - along } : { x: along, y: across }
})
</script>

<template>
  <ChartTip :id="tooltipId" :open="open && category !== undefined" :anchor="plot" follow-cursor :anchor-point="anchorPoint" :side="side" max-width="16rem" @dismiss="setOpen(false)">
    <template v-if="category !== undefined">
      <slot :category="category" :index="activeIndex" :rows="rows" :total="total">
        <span class="bar-tip">
          <span class="bar-tip-title">{{ category }}</span>
          <span class="bar-tip-rows">
            <span v-for="row in rows" :key="row.id" class="bar-tip-row">
              <span aria-hidden="true" class="bar-tip-dot" :style="{ backgroundColor: row.color }" />
              <span class="bar-tip-name">{{ row.name }}</span>
              <span class="bar-tip-value">{{ row.value === null ? t('noData') : '' }}<NumberTicker v-if="row.value !== null" :value="row.value" :format="() => formatValue(row.value!)" :start-on-view="false" :duration="0.2" :stagger="0" class-name="ws" /></span>
            </span>
            <span v-if="!grouped && rows.length > 1" class="bar-tip-row total">
              <span class="bar-tip-name">{{ t('total') }}</span>
              <span class="bar-tip-value strong"><NumberTicker :value="total" :format="() => formatValue(total)" :start-on-view="false" :duration="0.2" :stagger="0" class-name="ws" /></span>
            </span>
          </span>
        </span>
      </slot>
    </template>
  </ChartTip>
</template>

<!-- Tooltip content is teleported to the body, so its rules cannot be scoped. -->
<style>
.bar-tip { display: block; min-width: 9rem; max-width: 100%; }
.bar-tip-title { display: block; margin-bottom: 6px; font-size: 12px; line-height: calc(4 / 3); font-weight: 500; }
.bar-tip-rows { display: grid; gap: 4px; }
.bar-tip-row { display: flex; align-items: center; gap: 8px; font-size: 11px; line-height: calc(4 / 3); }
.bar-tip-dot { flex: none; width: 4px; height: 10px; border-radius: 9999px; }
.bar-tip-name { min-width: 0; flex: 1; overflow: hidden; padding-right: 12px; text-overflow: ellipsis; white-space: nowrap; color: var(--beui-muted-foreground); }
.bar-tip-value { flex: none; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.bar-tip-value .ws { white-space: pre; }
.bar-tip-row.total { margin-top: 2px; padding-top: 6px; border-top: 1px solid var(--beui-border); }
.bar-tip-row.total .bar-tip-name { padding-right: 0; }
.bar-tip-value.strong { font-weight: 500; }
</style>

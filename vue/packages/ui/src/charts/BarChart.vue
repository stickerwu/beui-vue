<script setup lang="ts">
import { SR_ONLY } from './plot-utils'
import BarChartLegend from './BarChartLegend.vue'
import BarChartPlot from './BarChartPlot.vue'
import BarChartTooltip from './BarChartTooltip.vue'
import { provideBarChart, useBarChartModel, type BarChartEmit, type BarChartProps } from './bar-chart-context'

defineSlots<{
  /** Compose `BarChartPlot`, `BarChartTooltip` and `BarChartLegend`; omit it for the complete chart. */
  default?(): unknown
}>()
const props = defineProps<BarChartProps>()
const emit = defineEmits<{ 'update:activeId': [id: string | null]; 'update:hiddenSeries': [ids: string[]]; activeChange: [id: string | null]; hiddenSeriesChange: [ids: string[]] }>()
const model = useBarChartModel(props, emit as BarChartEmit)
provideBarChart(model)
const { t, label, data, formatValue } = model
</script>

<template>
  <section class="bar-chart" :aria-label="label" data-slot="bar-chart">
    <slot>
      <BarChartPlot />
      <BarChartTooltip />
      <BarChartLegend v-if="data.rows.length > 1" />
    </slot>
    <div :style="SR_ONLY">
      <table>
        <caption>{{ t('dataCaption', { label }) }}</caption>
        <thead><tr><th scope="col">{{ t('category') }}</th><th v-for="row in data.rows" :key="row.id" scope="col">{{ row.name }}</th></tr></thead>
        <tbody><tr v-for="(name, index) in data.categories" :key="name"><th scope="row">{{ name }}</th><td v-for="row in data.rows" :key="row.id">{{ row.values[index] === null ? t('noData') : formatValue(row.values[index]!) }}</td></tr></tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.bar-chart { position: relative; width: 100%; min-width: 0; display: grid; gap: 12px; }
</style>

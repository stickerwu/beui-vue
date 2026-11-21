<script setup lang="ts">
import LineChartPlot from './graphics/LineChartPlot.vue'
import LineChartTooltip from './graphics/LineChartTooltip.vue'
import LineChartLegend from './graphics/LineChartLegend.vue'
import { provideLineChart, type LineChartProps } from './graphics/chart-model'

const props = defineProps<LineChartProps>()
const emit = defineEmits<{
  'update:activeId': [id: string | null]
  'update:hiddenSeries': [ids: readonly string[]]
  activeChange: [id: string | null]
  hiddenSeriesChange: [ids: readonly string[]]
}>()
const { data, loading, label, valueText, messages } = provideLineChart(props, id => {
  emit('update:activeId', id)
  emit('activeChange', id)
}, ids => {
  emit('update:hiddenSeries', ids)
  emit('hiddenSeriesChange', ids)
})
</script>

<template>
  <section class="line-chart" data-slot="line-chart" :aria-label="label" :aria-busy="loading || undefined">
    <slot>
      <LineChartPlot />
      <LineChartTooltip />
      <LineChartLegend v-if="data.rows.length > 1" />
    </slot>
    <div v-if="!loading" class="data-equivalent">
      <table>
        <caption>{{ messages.dataCaption.replace('{label}', label) }}</caption>
        <thead><tr><th scope="col">{{ messages.category }}</th><th v-for="row in data.rows" :key="row.id" scope="col">{{ row.name }}</th></tr></thead>
        <tbody><tr v-for="(category, index) in data.categories" :key="category">
          <th scope="row">{{ category }}</th><td v-for="row in data.rows" :key="row.id">{{ valueText(row.values[index]) }}</td>
        </tr></tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.line-chart { position: relative; min-width: 0; width: 100%; display: flow-root; }
.data-equivalent { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>

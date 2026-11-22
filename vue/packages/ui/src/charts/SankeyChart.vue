<script setup lang="ts">
import { SR_ONLY } from './plot-utils'
import SankeyChartPlot from './SankeyChartPlot.vue'
import SankeyChartTooltip from './SankeyChartTooltip.vue'
import { provideSankey, useSankeyModel, type SankeyChartEmit, type SankeyChartProps } from './sankey-context'

defineSlots<{
  /**
   * Compose `SankeyChartPlot` and `SankeyChartTooltip`; omit it for the complete chart.
   *
   * ```vue
   * <SankeyChart :nodes="nodes" :links="links" :format-value="usd">
   *   <SankeyChartPlot />
   *   <SankeyChartTooltip />
   * </SankeyChart>
   * ```
   */
  default?(): unknown
}>()
const props = defineProps<SankeyChartProps>()
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()
const model = useSankeyModel(props, emit as SankeyChartEmit)
provideSankey(model)
const { t, title, formatValue, flows, percent } = model
</script>

<template>
  <section class="sankey" data-slot="sankey-chart" :aria-label="title">
    <slot>
      <SankeyChartPlot />
      <SankeyChartTooltip />
    </slot>
    <div :style="SR_ONLY"><table><caption>{{ t('tableCaption', { label: title }) }}</caption>
      <thead><tr><th scope="col">{{ t('flow') }}</th><th scope="col">{{ t('value') }}</th><th scope="col">{{ t('shareOfSource') }}</th></tr></thead>
      <tbody><tr v-for="flow in flows" :key="flow.id"><th scope="row">{{ t('flowRow', { source: flow.source, target: flow.target }) }}</th><td>{{ formatValue(flow.value) }}</td><td>{{ flow.share ? percent(flow.share) : '' }}</td></tr></tbody></table></div>
  </section>
</template>

<style scoped>
.sankey { width: 100%; min-width: 0; }
</style>

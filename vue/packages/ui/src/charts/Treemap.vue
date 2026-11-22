<script setup lang="ts">
import { SR_ONLY } from './plot-utils'
import TreemapLegend from './TreemapLegend.vue'
import TreemapPlot from './TreemapPlot.vue'
import TreemapTooltip from './TreemapTooltip.vue'
import { provideTreemap, useTreemapModel, type TreemapEmit, type TreemapProps } from './treemap-context'

defineSlots<{
  /** Compose `TreemapPlot`, `TreemapTooltip` and `TreemapLegend`; omit it for the complete chart. */
  default?(): unknown
}>()
const props = defineProps<TreemapProps>()
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()
const model = useTreemapModel(props, emit as TreemapEmit)
provideTreemap(model)
const { t, label, formatValue, model: parsed } = model
</script>

<template>
  <section class="treemap" data-slot="treemap" :aria-label="label">
    <slot>
      <TreemapPlot />
      <TreemapTooltip />
      <TreemapLegend />
    </slot>
    <div :style="SR_ONLY"><table><caption>{{ t('tableCaption', { label }) }}</caption>
      <thead><tr><th scope="col">{{ t('item') }}</th><th scope="col">{{ t('value') }}</th><th scope="col">{{ t('share') }}</th><th scope="col">{{ t('details') }}</th></tr></thead>
      <tbody><tr v-for="item in parsed.items" :key="item.id"><th scope="row">{{ item.path.join(' / ') }}</th><td>{{ formatValue(item.value) }}</td><td>{{ (item.share * 100).toFixed(1) }}%</td><td>{{ item.description ?? '' }}</td></tr></tbody></table></div>
  </section>
</template>

<style scoped>
.treemap { display: flex; flex-direction: column; gap: 16px; width: 100%; min-width: 0; }
</style>

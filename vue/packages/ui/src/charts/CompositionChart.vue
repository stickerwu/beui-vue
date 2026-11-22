<script setup lang="ts">
import CompositionChartLegend from './CompositionChartLegend.vue'
import CompositionChartPlot from './CompositionChartPlot.vue'
import { provideComposition, useCompositionModel, type CompositionChartEmit, type CompositionChartProps } from './composition-context'

defineSlots<{
  /** Compose `CompositionChartPlot` and `CompositionChartLegend`; omit it for the complete chart. */
  default?(): unknown
}>()
const props = defineProps<CompositionChartProps>()
const emit = defineEmits<{ 'update:period': [period: string]; periodChange: [period: string] }>()
const model = useCompositionModel(props, emit as CompositionChartEmit)
provideComposition(model)
const { label } = model
</script>

<template>
  <section class="composition" :aria-label="label" data-slot="composition-chart">
    <slot>
      <div class="grid">
        <CompositionChartPlot />
        <CompositionChartLegend />
      </div>
    </slot>
  </section>
</template>

<style scoped>
.composition { container-type: inline-size; width: 100%; font-family: inherit; }
.composition > * + * { margin-top: 16px; }
.grid { display: grid; gap: 16px; }
</style>

<script setup lang="ts">
import HeatCalendarGrid from './HeatCalendarGrid.vue'
import HeatCalendarLegend from './HeatCalendarLegend.vue'
import HeatCalendarTooltip from './HeatCalendarTooltip.vue'
import { provideHeatCalendar, useHeatCalendarModel, type HeatCalendarEmit, type HeatCalendarProps } from './heat-calendar-context'

defineSlots<{
  /** Compose `HeatCalendarGrid` (with `HeatCalendarTooltip` inside) and `HeatCalendarLegend`; omit it for the complete chart. */
  default?(): unknown
}>()
const props = withDefaults(defineProps<HeatCalendarProps>(), { weeks: 16, maxCount: 14, color: 'var(--beui-accent, oklch(72% 0.18 195))', selection: undefined })
const emit = defineEmits<{
  'update:selection': [range: HeatCalendarProps['selection']]
  selectionChange: [range: HeatCalendarProps['selection']]
}>()
provideHeatCalendar(useHeatCalendarModel(props, emit as HeatCalendarEmit))
</script>

<template>
  <div class="heat" data-slot="heat-calendar">
    <slot>
      <HeatCalendarGrid><HeatCalendarTooltip /></HeatCalendarGrid>
      <HeatCalendarLegend />
    </slot>
  </div>
</template>

<style scoped>
.heat { width: fit-content; max-width: 100%; font-family: inherit; }
</style>

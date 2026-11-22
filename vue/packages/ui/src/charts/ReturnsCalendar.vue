<script setup lang="ts">
import ReturnsCalendarGrid from './ReturnsCalendarGrid.vue'
import ReturnsCalendarTooltip from './ReturnsCalendarTooltip.vue'
import { provideReturnsCalendar, useReturnsCalendarModel, type ReturnsCalendarEmit, type ReturnsCalendarProps } from './returns-calendar-context'

defineSlots<{
  /** Compose `ReturnsCalendarGrid` (with `ReturnsCalendarTooltip` inside); omit it for the complete chart. */
  default?(): unknown
}>()
const props = withDefaults(defineProps<ReturnsCalendarProps>(), { years: () => [], returns: () => [], selection: undefined })
const emit = defineEmits<{
  'update:selection': [range: ReturnsCalendarProps['selection']]
  selectionChange: [range: ReturnsCalendarProps['selection']]
}>()
provideReturnsCalendar(useReturnsCalendarModel(props, emit as ReturnsCalendarEmit))
</script>

<template>
  <div class="returns be-returns-calendar" data-slot="returns-calendar">
    <slot>
      <ReturnsCalendarGrid><ReturnsCalendarTooltip /></ReturnsCalendarGrid>
    </slot>
  </div>
</template>

<style scoped>
.returns { --ink-l: .5; width: 480px; max-width: 100%; font-family: inherit; }
</style>

<style>
.dark .be-returns-calendar, [data-beui-theme='dark'] .be-returns-calendar { --ink-l: 1; }
</style>

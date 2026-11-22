<script setup lang="ts">
import { HeatCalendar, HeatCalendarGrid, HeatCalendarLegend, HeatCalendarTooltip } from 'beui-vue'

const activity = Array.from({ length: 16 }, (_, week) => Array.from({ length: 7 }, (_, day) => {
  const sample = Math.sin(week * 12.9898 + day * 78.233) * 43758.5453
  const level = sample - Math.floor(sample)
  return day >= 5 ? Math.max(0, level - .55) * 1.4 : level
}))
</script>

<template>
  <HeatCalendar :values="activity" :weeks="16" :max-count="14" unit="commits">
    <HeatCalendarGrid><HeatCalendarTooltip /></HeatCalendarGrid>
    <HeatCalendarLegend />
  </HeatCalendar>
</template>

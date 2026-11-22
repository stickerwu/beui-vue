<script setup lang="ts">
import { ReturnsCalendar, ReturnsCalendarGrid, ReturnsCalendarTooltip } from 'beui-vue'

const years = [2021, 2022, 2023, 2024, 2025]
let seed = 2021
const returns = years.map((_, index) => Array.from({ length: 12 }, () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return Math.round(((index === 1 ? -1.6 : .9) + (seed / 0x7fffffff - .5) * 12) * 10) / 10
}))
</script>

<template>
  <ReturnsCalendar :years="years" :returns="returns">
    <ReturnsCalendarGrid><ReturnsCalendarTooltip /></ReturnsCalendarGrid>
  </ReturnsCalendar>
</template>

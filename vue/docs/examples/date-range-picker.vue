<script setup lang="ts">
import { DateRangePicker, type DateRange } from 'beui-vue'
import { ref } from 'vue'

const date = (daysAgo: number) => {
  const day = new Date()
  day.setDate(day.getDate() - daysAgo)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}
const today = date(0)
const range = ref<DateRange | null>({ from: date(6), to: today })
</script>
<template><DateRangePicker v-model="range" label="Reporting period" :default-month="today" :max="today" /></template>

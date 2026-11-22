<script setup lang="ts">
import {
  DateRangePicker, DateRangePickerCalendar, DateRangePickerClear, DateRangePickerContent, DateRangePickerFooter,
  DateRangePickerGrid, DateRangePickerHeader, DateRangePickerSelection, DateRangePickerTrigger, type DateRange,
} from 'beui-vue'
import { ref } from 'vue'

const date = (daysAgo: number) => {
  const day = new Date()
  day.setDate(day.getDate() - daysAgo)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}
const today = date(0)
const range = ref<DateRange | null>({ from: date(6), to: today })
</script>
<template>
  <DateRangePicker v-model="range" label="Reporting period" :default-month="today" :max="today">
    <DateRangePickerTrigger />
    <DateRangePickerContent>
      <DateRangePickerCalendar bare>
        <DateRangePickerHeader />
        <DateRangePickerGrid />
        <DateRangePickerFooter>
          <div class="footer">
            <DateRangePickerSelection />
            <DateRangePickerClear />
          </div>
        </DateRangePickerFooter>
      </DateRangePickerCalendar>
    </DateRangePickerContent>
  </DateRangePicker>
</template>
<style scoped>
.footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
</style>

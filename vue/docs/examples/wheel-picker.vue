<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Switch, WheelPicker } from 'beui-vue'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const YEARS = Array.from({ length: 60 }, (_, index) => String(1980 + index))
const daysIn = (month: number, year: number) => new Date(year, month + 1, 0).getDate()

const month = ref('June')
const year = ref('2004')
const day = ref('9')
const sound = ref(false)

const dayCount = computed(() => daysIn(MONTHS.indexOf(month.value), Number(year.value)))
const days = computed(() => Array.from({ length: dayCount.value }, (_, index) => String(index + 1)))

// A short month or a non-leap February can strand the day past the end — pull
// it back to the last valid day.
watch(dayCount, count => { if (Number(day.value) > count) day.value = String(count) })
</script>

<template>
  <div class="demo">
    <span class="caption">
      Born <span class="born">{{ month }} {{ day }}, {{ year }}</span>
    </span>
    <div class="wheels">
      <WheelPicker v-model="month" class="wheel month" :options="MONTHS" :visible-count="7" :item-height="42" :sound="sound" aria-label="Month" />
      <WheelPicker v-model="day" class="wheel day" :options="days" :visible-count="7" :item-height="42" :sound="sound" aria-label="Day" />
      <WheelPicker v-model="year" class="wheel year" :options="YEARS" :visible-count="7" :item-height="42" :sound="sound" aria-label="Year" />
    </div>
    <Switch class="sound" :checked="sound" label="Tick sound" @update:checked="sound = $event" />
  </div>
</template>

<style scoped>
.demo { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.caption { font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.born { font-weight: 500; font-variant-numeric: tabular-nums; color: var(--beui-foreground); }
.wheels { display: flex; align-items: stretch; gap: .25rem; padding: .5rem; border: 1px solid var(--beui-border); border-radius: 1.5rem; background: var(--beui-background); }
.sound { transform-origin: left; transform: scale(.85); }
.sound :deep(label) { font-size: .875rem; }
.wheels :deep(.wheel) { border: 0; background: transparent; }
.wheels :deep(.month) { width: 8rem; }
.wheels :deep(.day) { width: 3.5rem; }
.wheels :deep(.year) { width: 5rem; }
</style>

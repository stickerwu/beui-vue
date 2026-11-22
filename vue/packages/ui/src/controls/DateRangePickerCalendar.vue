<script setup lang="ts">
import { computed, inject } from 'vue'
import DateRangePickerFooter from './DateRangePickerFooter.vue'
import DateRangePickerGrid from './DateRangePickerGrid.vue'
import DateRangePickerHeader from './DateRangePickerHeader.vue'
import DateRangePickerSummary from './DateRangePickerSummary.vue'
import { DRP_KEY, parse } from './drp-core'

/** Calendar surface; arrange or omit its summary, header, grid and footer. Without children it renders them all. */
const props = withDefaults(defineProps<{
  /** Show the start/end summary above the calendar. Defaults to the picker's `showSummary`. */
  showSummary?: boolean
  /** Drop the card chrome when the calendar sits inside a popover. */
  bare?: boolean
}>(), { showSummary: undefined })
defineSlots<{
  /** The calendar's parts, in the order you want them. */
  default?: () => unknown
}>()
const ctx = inject(DRP_KEY)
if (!ctx) throw new Error('DateRangePickerCalendar must be used within DateRangePicker')
const summaryShown = computed(() => props.showSummary ?? ctx.showSummary.value)
</script>

<template>
  <section class="drp-calendar" :class="{ 'drp-calendar-bare': bare }" :aria-label="ctx.label.value">
    <h3 :id="ctx.heading" aria-live="polite" class="drp-sr">{{ ctx.formats.value.month.format(parse(ctx.month.value)) }}</h3>
    <slot v-if="$slots.default" />
    <template v-else>
      <DateRangePickerSummary v-if="summaryShown" />
      <DateRangePickerHeader />
      <DateRangePickerGrid />
      <DateRangePickerFooter />
    </template>
    <p :id="ctx.help" class="drp-sr">{{ ctx.t('help') }}</p>
    <span role="status" class="drp-sr">{{ ctx.announcement.value }}</span>
  </section>
</template>

<style>
.drp-calendar { box-sizing: border-box; width: 20rem; max-width: 100%; padding: 0.875rem; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; text-align: start; }
.drp-calendar-bare { width: 100%; border: 0; border-radius: 0; }
.drp-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.drp-muted { color: var(--beui-muted-foreground); }
.drp-calendar .drp-hidden { display: none; }
.drp-calendar :is(p, h3) { margin: 0; }
</style>

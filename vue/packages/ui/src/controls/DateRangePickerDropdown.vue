<script setup lang="ts">
import DateRangePicker from './DateRangePicker.vue'
import DateRangePickerCalendar from './DateRangePickerCalendar.vue'
import DateRangePickerContent from './DateRangePickerContent.vue'
import DateRangePickerTrigger from './DateRangePickerTrigger.vue'
import type { DateRange, DateRangePickerRootProps } from './drp-core'

/** Convenience composition of the root, trigger, content and calendar. */
const props = withDefaults(defineProps<DateRangePickerRootProps & {
  /** Extra classes for the trigger. */
  triggerClassName?: string
  /** Extra classes for the calendar. */
  calendarClassName?: string
}>(), {
  modelValue: undefined, defaultValue: undefined, open: undefined, autoFocus: true, showSummary: false,
  disabled: false, closeOnSelect: false, defaultOpen: false, inline: false,
})
const emit = defineEmits<{
  'update:modelValue': [value: DateRange | null]
  'update:open': [open: boolean]
}>()
</script>

<template>
  <DateRangePicker
    :model-value="props.modelValue" :default-value="props.defaultValue" :default-month="props.defaultMonth" :min="props.min" :max="props.max"
    :is-date-disabled="props.isDateDisabled" :presets="props.presets" :locale="props.locale" :label="props.label" :disabled="props.disabled"
    :auto-focus="props.autoFocus" :show-summary="props.showSummary" :open="props.open" :default-open="props.defaultOpen"
    :close-on-select="props.closeOnSelect" :labels="props.labels"
    @update:model-value="emit('update:modelValue', $event)" @update:open="emit('update:open', $event)">
    <DateRangePickerTrigger :placeholder="props.placeholder" :class="props.triggerClassName" />
    <DateRangePickerContent :auto-focus="props.autoFocus">
      <DateRangePickerCalendar bare :class="props.calendarClassName" />
    </DateRangePickerContent>
  </DateRangePicker>
</template>

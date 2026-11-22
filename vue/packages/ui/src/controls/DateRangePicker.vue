<script lang="ts">
export { dateRangePickerMessages, type DateRangePickerMessages } from './drp-core'
</script>

<script setup lang="ts">
import { provide } from 'vue'
import DateRangePickerCalendar from './DateRangePickerCalendar.vue'
import DateRangePickerContent from './DateRangePickerContent.vue'
import DateRangePickerTrigger from './DateRangePickerTrigger.vue'
// The types import comes first: the API docs reader resolves each type file once.
import { DRP_KEY, type DateRange, type DateRangePickerRootProps } from './drp-core'
import { useDrpController } from './drp-controller'

/**
 * A date range picker: a trigger that morphs open into a calendar (or the calendar inline with
 * `inline`). Compose `DateRangePickerTrigger` and `DateRangePickerContent` (holding a
 * `DateRangePickerCalendar` and its parts) inside, or omit the default slot for the ready-made picker.
 */
const props = withDefaults(defineProps<DateRangePickerRootProps>(), {
  modelValue: undefined, defaultValue: undefined, open: undefined, autoFocus: undefined, showSummary: undefined,
  disabled: false, closeOnSelect: false, defaultOpen: false, inline: false,
})
const emit = defineEmits<{
  'update:modelValue': [value: DateRange | null]
  'update:open': [open: boolean]
}>()
defineSlots<{
  /** Compose the picker from its parts. Omit it for the ready-made trigger and calendar. */
  default?: () => unknown
}>()

const ctx = useDrpController(
  {
    get defaultValue() { return props.defaultValue },
    get defaultMonth() { return props.defaultMonth },
    get min() { return props.min },
    get max() { return props.max },
    get isDateDisabled() { return props.isDateDisabled },
    get presets() { return props.presets },
    get locale() { return props.locale },
    get label() { return props.label },
    get disabled() { return props.disabled },
    get autoFocus() { return props.autoFocus ?? false },
    get showSummary() { return props.showSummary ?? props.inline },
    get closeOnSelect() { return props.closeOnSelect },
    get defaultOpen() { return props.defaultOpen },
    get labels() { return props.labels },
  },
  () => props.modelValue,
  () => props.open,
  value => emit('update:modelValue', value),
  next => emit('update:open', next),
)
provide(DRP_KEY, ctx)

const rootRef = (node: unknown) => { ctx.root.value = node as HTMLElement | null }

defineExpose({ open: ctx.open, setOpen: ctx.setOpen, clear: ctx.clear })
</script>

<template>
  <div :ref="rootRef" class="drp-root" :class="{ 'drp-inline': inline && !$slots.default }">
    <slot v-if="$slots.default" />
    <DateRangePickerCalendar v-else-if="inline" />
    <template v-else>
      <DateRangePickerTrigger :placeholder="placeholder" />
      <DateRangePickerContent :auto-focus="autoFocus !== false">
        <DateRangePickerCalendar bare />
      </DateRangePickerContent>
    </template>
  </div>
</template>

<style>
.drp-root { position: relative; display: inline-flex; max-width: 100%; }
.drp-root.drp-inline { display: block; }
</style>

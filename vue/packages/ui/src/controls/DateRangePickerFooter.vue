<script setup lang="ts">
import DateRangePickerClear from './DateRangePickerClear.vue'
import DateRangePickerPresets from './DateRangePickerPresets.vue'
import DateRangePickerSelection from './DateRangePickerSelection.vue'

/** Below the grid: by default the selection text, the clear button and the presets. */
defineSlots<{
  /** Replaces the default footer content. */
  default?: () => unknown
}>()
</script>

<template>
  <div class="drp-footer">
    <slot v-if="$slots.default" />
    <template v-else>
      <div class="drp-footer-row">
        <DateRangePickerSelection />
        <DateRangePickerClear />
      </div>
      <DateRangePickerPresets />
    </template>
  </div>
</template>

<style>
.drp-footer { margin-top: 0.625rem; padding-top: 0.625rem; border-top: 1px solid var(--beui-border); }
.drp-footer-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
</style>

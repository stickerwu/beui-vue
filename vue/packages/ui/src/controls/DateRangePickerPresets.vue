<script setup lang="ts">
import { inject } from 'vue'
import DateRangePickerPreset from './DateRangePickerPreset.vue'
import { DRP_KEY } from './drp-core'

/** Preset range buttons. Without children it lists the picker's `presets`. */
defineSlots<{
  /** Your own `DateRangePickerPreset`s. */
  default?: () => unknown
}>()
const ctx = inject(DRP_KEY)
if (!ctx) throw new Error('DateRangePickerPresets must be used within DateRangePicker')
</script>

<template>
  <div v-if="$slots.default || ctx.presets.value.length" class="drp-presets">
    <slot>
      <DateRangePickerPreset v-for="preset in ctx.presets.value" :key="preset.label" :value="preset.value" :label="preset.label" />
    </slot>
  </div>
</template>

<style>
.drp-presets { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.375rem; margin-top: 0.625rem; }
</style>

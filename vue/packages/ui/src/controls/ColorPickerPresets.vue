<script setup lang="ts">
import { useColorPickerContext } from './color-picker-context'

/** A row of `ColorPickerPreset` swatches. */
defineSlots<{ default?: () => unknown }>()
const context = useColorPickerContext('ColorPickerPresets')
</script>

<template>
  <div class="be-picker-presets" role="group" :aria-label="context.t.value.presets"><slot /></div>
</template>

<style>
.be-picker-presets { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: space-between; padding: .25rem .125rem 0; }
</style>

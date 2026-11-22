<script setup lang="ts">
import { useColorPickerContext } from './color-picker-context'

/** A read-only chip of the current color over a checkerboard. */
const context = useColorPickerContext('ColorPickerSwatch')
</script>

<template>
  <span class="be-picker-swatch" aria-hidden="true">
    <span class="be-picker-swatch-fill" :style="{ backgroundColor: context.hex.value }" />
  </span>
</template>

<style>
.be-picker-swatch { position: relative; display: block; box-sizing: border-box; width: 2.25rem; height: 2.25rem; flex: none; overflow: hidden; border-radius: .5rem; background: repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px; }
.be-picker-swatch-fill { position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); transition: background-color .15s; }
</style>

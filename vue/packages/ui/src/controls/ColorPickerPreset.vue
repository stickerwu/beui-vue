<script setup lang="ts">
import { arc, motion } from 'motion-v'
import { computed } from 'vue'
import { layoutSpring, pressSpring } from '../core/motion'
import { useReducedMotion } from '../core/reduced-motion'
import { parseColor, toHex } from './colors'
import { useColorPickerContext } from './color-picker-context'

/** One preset swatch; picking it applies and commits its color. */
const props = defineProps<{
  /** Any hex color. */
  value: string
  /** Accessible name; selection never relies on color alone. */
  label?: string
}>()

const context = useColorPickerContext('ColorPickerPreset')
const reduce = useReducedMotion()
// The selection ring hops between swatches over a low arc instead of sliding.
// arc() bends with distance (the apex sits at half of strength x distance), so
// a neighbour gets a ~5px hop and a jump across the row clears the fields above.
// Automatic direction always puts a horizontal bulge below the row; a negative
// strength mirrors it above, in both directions of travel.
const PRESET_HOP = { ...layoutSpring, layout: { ...layoutSpring, path: arc({ strength: -0.3 }) } }
const parsed = computed(() => parseColor(props.value, context.channels.value))
const normalized = computed(() => (parsed.value ? toHex(parsed.value) : props.value))
const selected = computed(() => normalized.value === context.hex.value)
function pick() {
  if (!parsed.value) return
  context.update(parsed.value)
  context.commit()
}
</script>

<template>
  <motion.button
    type="button" class="be-picker-preset" :aria-label="label ?? value" :aria-pressed="selected" :disabled="context.disabled.value"
    :while-press="reduce || context.disabled.value ? undefined : { scale: 0.88 }" :transition="pressSpring" @click="pick">
    <motion.span
      v-if="selected" class="be-picker-preset-ring" aria-hidden="true"
      :layout-id="reduce ? undefined : `${context.id}-preset`" :initial="false" :transition="PRESET_HOP" />
    <span class="be-picker-preset-swatch" aria-hidden="true">
      <span class="be-picker-preset-fill" :style="{ backgroundColor: normalized }" />
    </span>
  </motion.button>
</template>

<style>
.be-picker-preset { position: relative; box-sizing: border-box; width: 1.5rem; height: 1.5rem; flex: none; padding: 0; border: 0; border-radius: 50%; background: none; outline: none; cursor: pointer; }
.be-picker-preset:focus-visible { outline: 2px solid var(--beui-foreground); outline-offset: 3px; }
.be-picker-preset:disabled { cursor: not-allowed; }
.be-picker-preset-ring { pointer-events: none; position: absolute; inset: -3px; border: 2px solid color-mix(in srgb, var(--beui-foreground) 70%, transparent); border-radius: 50%; }
.be-picker-preset-swatch { position: absolute; inset: 0; overflow: hidden; border-radius: 50%; background: repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px; }
.be-picker-preset-fill { position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
</style>

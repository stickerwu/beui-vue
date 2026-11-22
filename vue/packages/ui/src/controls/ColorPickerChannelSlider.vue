<script setup lang="ts">
import { motion } from 'motion-v'
import { shallowRef } from 'vue'
import { useColorPickerContext, useGlide } from './color-picker-context'

/** The rail, thumb and pointer handling shared by `ColorPickerHue` and `ColorPickerAlpha`. */
const props = defineProps<{
  /** CSS background of the track. */
  track: string
  /** Thumb position along the rail, 0-100. */
  position: number
  thumbColor: string
  label: string
  min: number
  max: number
  now: number
  valueText: string
  /** Called with the pointer's 0-1 position along the rail. */
  onPoint: (fraction: number) => void
  onKeys: (event: KeyboardEvent) => void
  checker?: boolean
}>()

const context = useColorPickerContext('ColorPickerChannelSlider')
const glide = useGlide(() => props.position)
const rail = shallowRef<HTMLDivElement | null>(null)
const dragging = shallowRef(false)

function fraction(event: PointerEvent) {
  const box = rail.value?.getBoundingClientRect()
  if (!box || !box.width) return 0
  return Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
}
function down(event: PointerEvent) {
  if (context.disabled.value || event.button !== 0) return
  dragging.value = true
  try { rail.value?.setPointerCapture(event.pointerId) } catch { /* already gone */ }
  props.onPoint(fraction(event))
}
function move(event: PointerEvent) { if (dragging.value) props.onPoint(fraction(event)) }
function up(event: PointerEvent) {
  if (!dragging.value) return
  try { if (rail.value?.hasPointerCapture(event.pointerId)) rail.value.releasePointerCapture(event.pointerId) } catch { /* dropped */ }
  dragging.value = false
  context.commit()
}
</script>

<template>
  <div class="be-picker-slider" :class="{ 'be-picker-alpha-track': checker }" :style="{ background: track }">
    <span class="be-picker-rail-ring" aria-hidden="true" />
    <div ref="rail" class="be-picker-rail" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
      <motion.div class="be-picker-thumb-plane" :style="{ x: glide.offset }">
        <div class="be-picker-thumb-zone">
          <div
            class="be-picker-thumb be-picker-hue-thumb" role="slider" tabindex="0" aria-orientation="horizontal"
            :aria-label="label" :aria-valuemin="min" :aria-valuemax="max" :aria-valuenow="now" :aria-valuetext="valueText"
            :aria-disabled="context.disabled.value || undefined" :style="{ backgroundColor: thumbColor }" @keydown="onKeys" />
        </div>
      </motion.div>
    </div>
  </div>
</template>

<style>
.be-picker-slider { position: relative; height: .875rem; width: 100%; border-radius: 999px; touch-action: none; cursor: pointer; }
.be-picker-alpha-track { background-clip: padding-box; }
.be-picker-rail-ring { pointer-events: none; position: absolute; inset: 0; border-radius: 999px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
.be-picker-rail { position: absolute; inset-block: 0; left: 9px; right: 9px; }
.be-picker-rail .be-picker-thumb-zone { top: 50%; }
.be-picker-hue-thumb { cursor: pointer; }
</style>

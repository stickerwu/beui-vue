<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, inject, shallowRef } from 'vue'
import { easeOut } from '../core/motion'
import { useReducedMotion } from '../core/reduced-motion'
import ColorPickerThumb from './ColorPickerThumb.vue'
import { MORPH, colorPickerMorphKey, fillTemplate, keyStep, useColorPickerContext, useGlide } from './color-picker-context'

/** Saturation and brightness area. Placed directly inside `ColorPickerContent`, it grows out of the trigger chip. */
const props = defineProps<{
  /** Accessible name for the 2D thumb. Default "Saturation and brightness". */
  label?: string
}>()

const context = useColorPickerContext('ColorPickerArea')
const morph = inject(colorPickerMorphKey, false)
const reduce = useReducedMotion()
const area = shallowRef<HTMLDivElement | null>(null)
function bindArea(node: unknown) { area.value = ((node as { $el?: HTMLDivElement } | null)?.$el ?? node) as HTMLDivElement | null }
const channels = context.channels
const x = useGlide(() => channels.value.saturation)
const y = useGlide(() => 100 - channels.value.brightness)
const dragging = shallowRef(false)

function point(event: PointerEvent) {
  const element = area.value
  if (!element) return
  const box = element.getBoundingClientRect()
  if (!box.width || !box.height) return
  context.update({
    ...channels.value,
    saturation: ((event.clientX - box.left) / box.width) * 100,
    brightness: (1 - (event.clientY - box.top) / box.height) * 100,
  })
}
function down(event: PointerEvent) {
  if (context.disabled.value || event.button !== 0) return
  dragging.value = true
  try { area.value?.setPointerCapture(event.pointerId) } catch { /* pointer already gone */ }
  // Focus follows the pointer, so the arrow keys pick up where the drag left off.
  area.value?.querySelector<HTMLElement>('[role="slider"]')?.focus({ preventScroll: true })
  point(event)
}
function up(event: PointerEvent) {
  if (!dragging.value) return
  try { if (area.value?.hasPointerCapture(event.pointerId)) area.value.releasePointerCapture(event.pointerId) } catch { /* dropped */ }
  dragging.value = false
  context.commit()
}
function move(event: PointerEvent) { if (dragging.value) point(event) }
function keys(event: KeyboardEvent) {
  if (context.disabled.value) return
  const step = keyStep(event, 10)
  if (!step) return
  event.preventDefault()
  if (step === 'min') context.update({ ...channels.value, saturation: 0 })
  else if (step === 'max') context.update({ ...channels.value, saturation: 100 })
  else if (step.axis === 'x') context.update({ ...channels.value, saturation: channels.value.saturation + step.delta })
  else context.update({ ...channels.value, brightness: channels.value.brightness + step.delta })
  context.commit()
}

const morphing = computed(() => morph && !reduce.value)
const rgb = computed(() => `rgb(${context.rgb.value[0]} ${context.rgb.value[1]} ${context.rgb.value[2]})`)
const valueText = computed(() => fillTemplate(context.t.value.areaValue, {
  saturation: Math.round(channels.value.saturation),
  brightness: Math.round(channels.value.brightness),
}))
</script>

<template>
  <motion.div
    :ref="bindArea" class="be-picker-area"
    :layout-id="morphing ? `${context.id}-chip` : undefined" :layout-dependency="context.open.value" :transition="MORPH"
    :data-disabled="context.disabled.value || undefined"
    :style="{ borderRadius: '12px', background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${channels.hue} 100% 50%))` }"
    @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
    <motion.div
      v-if="morphing" aria-hidden="true" class="be-picker-dissolve" :style="{ backgroundColor: context.hex.value }"
      :initial="{ opacity: 1 }" :animate="{ opacity: 0 }" :transition="{ duration: 0.4, ease: easeOut, delay: 0.06 }" />
    <span class="be-picker-ring" aria-hidden="true" />
    <motion.div class="be-picker-thumb-fade" :initial="morphing ? { opacity: 0 } : false" :animate="{ opacity: 1 }" :transition="{ duration: 0.2, delay: 0.22 }">
      <ColorPickerThumb
        :dragging="dragging" :color="rgb" :glide="x.spring" :x="x.offset" :y="y.offset"
        role="slider" :tabindex="context.disabled.value ? -1 : 0"
        :aria-label="props.label ?? context.t.value.area" :aria-roledescription="context.t.value.areaRole"
        :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="Math.round(channels.saturation)" :aria-valuetext="valueText"
        :aria-disabled="context.disabled.value || undefined" @keydown="keys" />
    </motion.div>
  </motion.div>
</template>

<style>
/* No overflow clip: the loupe lifts above the area's top edge. The area paints its own
   rounded corners and every layer inside inherits the radius. */
.be-picker-area { position: relative; height: 10rem; width: 100%; border-radius: .75rem; cursor: crosshair; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
.be-picker-area[data-disabled] { cursor: not-allowed; }
.be-picker-dissolve { pointer-events: none; position: absolute; inset: 0; border-radius: inherit; }
.be-picker-thumb-fade { position: absolute; inset: 0; }
.be-picker-ring { pointer-events: none; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
</style>

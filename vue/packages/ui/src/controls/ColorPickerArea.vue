<script setup lang="ts">
import { motion, useSpring, useTransform, useVelocity } from 'motion-v'
import { computed, inject, shallowRef } from 'vue'
import { easeOut, pressSpring } from '../core/motion'
import { useReducedMotion } from '../core/reduced-motion'
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

// The loupe lifts with a visible overshoot so it reads as picked up, unlike
// the critically damped glide the thumb itself rides on.
const LOUPE_LIFT = { type: 'spring', stiffness: 520, damping: 24, mass: 0.6 } as const
const LOUPE_DROP = { duration: 0.12, ease: easeOut } as const
// Glide velocity in %/s mapped to a pendulum swing, so the loupe trails the drag.
const LOUPE_TILT_INPUT = [-400, 400]
const LOUPE_TILT_DEGREES = [16, -16]
const velocity = useVelocity(x.spring)
const tilt = useSpring(useTransform(velocity, LOUPE_TILT_INPUT, LOUPE_TILT_DEGREES, { clamp: true }), pressSpring)
const lifted = computed(() => dragging.value && !reduce.value)
const morphing = computed(() => morph && !reduce.value)
const valueText = computed(() => fillTemplate(context.t.value.areaValue, {
  saturation: Math.round(channels.value.saturation),
  brightness: Math.round(channels.value.brightness),
}))
</script>

<template>
  <motion.div
    :ref="bindArea" class="be-picker-area" role="slider" tabindex="0"
    :layout-id="morphing ? `${context.id}-chip` : undefined" :layout-dependency="context.open.value" :transition="MORPH"
    :aria-label="label ?? context.t.value.area" :aria-roledescription="context.t.value.areaRole"
    :aria-valuemin="0" :aria-valuemax="100" :aria-valuenow="Math.round(channels.saturation)" :aria-valuetext="valueText"
    :aria-disabled="context.disabled.value || undefined" :data-disabled="context.disabled.value || undefined"
    :style="{ borderRadius: '12px', background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${channels.hue} 100% 50%))` }"
    @keydown="keys" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
    <motion.div
      v-if="morph && !reduce" aria-hidden="true" class="be-picker-dissolve" :style="{ backgroundColor: context.hex.value }"
      :initial="{ opacity: 1 }" :animate="{ opacity: 0 }" :transition="{ duration: 0.4, ease: easeOut, delay: 0.06 }" />
    <span class="be-picker-ring" aria-hidden="true" />
    <motion.div class="be-picker-thumb-fade" :initial="morph && !reduce ? { opacity: 0 } : false" :animate="{ opacity: 1 }" :transition="{ duration: 0.2, delay: 0.22 }">
      <motion.div class="be-picker-thumb-plane" :style="{ x: x.offset, y: y.offset }">
        <div class="be-picker-thumb-zone">
          <motion.span
            class="be-picker-thumb" aria-hidden="true" :animate="{ scale: lifted ? 0.78 : 1 }" :transition="pressSpring"
            :style="{ backgroundColor: `rgb(${context.rgb.value[0]} ${context.rgb.value[1]} ${context.rgb.value[2]})` }" />
          <Transition name="be-picker-loupe">
            <motion.span
              v-if="lifted" class="be-picker-loupe" aria-hidden="true" :style="{ rotate: tilt }"
              :initial="{ opacity: 0, scale: 0.3, y: 16 }" :animate="{ opacity: 1, scale: 1, y: 0, transition: LOUPE_LIFT }"
              :exit="{ opacity: 0, scale: 0.3, y: 16, transition: LOUPE_DROP }">
              <span class="be-picker-loupe-square"><span class="be-picker-loupe-fill" :style="{ background: context.hex.value }" /></span>
            </motion.span>
          </Transition>
        </div>
      </motion.div>
    </motion.div>
  </motion.div>
</template>

<style>
.be-picker-area { position: relative; height: 10rem; width: 100%; border-radius: .75rem; cursor: crosshair; overflow: hidden; touch-action: none; }
.be-picker-area[data-disabled] { cursor: not-allowed; }
.be-picker-area:focus-visible { outline: 2px solid var(--beui-foreground); outline-offset: 2px; }
.be-picker-dissolve { pointer-events: none; position: absolute; inset: 0; border-radius: inherit; }
.be-picker-thumb-fade { position: absolute; inset: 0; }
.be-picker-ring { pointer-events: none; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
.be-picker-thumb-plane { position: absolute; inset: 0; pointer-events: none; }
.be-picker-thumb-zone { position: absolute; left: 0; top: 0; width: 1.125rem; height: 1.125rem; transform: translate(-50%, -50%); }
.be-picker-thumb { display: block; width: 100%; height: 100%; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / .12), 0 2px 6px rgb(0 0 0 / .25); outline: none; }
.be-picker-thumb:focus-visible { outline: 2px solid var(--beui-foreground); outline-offset: 2px; }
.be-picker-loupe { pointer-events: none; position: absolute; bottom: calc(100% + 12px); left: 50%; z-index: 10; margin-left: -1.25rem; display: block; width: 2.5rem; height: 2.5rem; transform-origin: 50% 130%; }
.be-picker-loupe-square { position: absolute; inset: 0; overflow: hidden; border: 3px solid white; border-radius: 50% 50% 50% 0; box-shadow: 0 0 0 1px rgb(0 0 0 / .1), 0 6px 16px rgb(0 0 0 / .28); transform: rotate(-45deg); background: repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px; }
.be-picker-loupe-fill { position: absolute; inset: 0; }
.be-picker-loupe-enter-active, .be-picker-loupe-leave-active { transition: opacity .12s; }
.be-picker-loupe-enter-from, .be-picker-loupe-leave-to { opacity: 0; }
</style>

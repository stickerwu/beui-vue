<script setup lang="ts">
import { AnimatePresence, motion, useSpring, useTransform, useVelocity } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { type SliderBaseProps } from './types'
import { useGlidePosition, useSlider } from './use-slider'

// Loose enough that the bubble keeps leaning a beat after the pointer stops.
const SPRING_TILT = { stiffness: 260, damping: 22, mass: 0.4 } as const
/** Drag speed (px/s of track percent) that maxes out lean and squash. */
const FULL_TILT = 320
const SPRING_PRESS = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 } as const
const SPRING_PANEL = { type: 'spring', stiffness: 420, damping: 40, mass: 0.5 } as const

/**
 * Slider with a value bubble that pops out of the thumb on grab and reacts to
 * how fast you drag: it leans into the direction of travel and squashes along
 * the way, then settles upright when you let go.
 */
const props = defineProps<SliderBaseProps & {
  /** Formats the value shown in the bubble. */
  format?: (value: number) => string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number], valueChange: [value: number] }>()
const reduce = useReducedMotion()
// A bare number needs no valueText — it would only repeat aria-valuenow.
const { sliderRef, percent, current, dragging, trackEvents, aria, onKeyDown } = useSlider(props, value => {
  emit('update:modelValue', value)
  emit('valueChange', value)
}, { formatValueText: value => props.format?.(value) })
const { pos } = useGlidePosition(percent)
const left = useTransform(() => `${pos.get()}%`)

// One spring drives the whole reaction: lean is signed, squash reads its
// magnitude. Two springs off the same velocity would just run twice.
const velocity = useVelocity(pos)
const lean = useSpring(useTransform(velocity, [-FULL_TILT, 0, FULL_TILT], [1, 0, -1], { clamp: true }), SPRING_TILT)
const tilt = useTransform(lean, value => value * 16)
const squash = useTransform(lean, value => 1 + Math.abs(value) * 0.18)
const stretch = useTransform(lean, value => 1 - Math.abs(value) * 0.12)
</script>

<template>
  <!-- px/pb leave room for the thumb, the bubble and the 48px hit area to
       overhang the 8px track without escaping the component's own box -->
  <div class="be-range-bubble" :class="{ 'be-range-bubble-disabled': disabled }">
    <div class="be-range-bubble-track" v-bind="trackEvents">
      <motion.div class="be-range-bubble-fill" :style="{ width: left }" />

      <!-- thumb — overhangs the track by half its width at both ends, which the
           wrapper's padding leaves room for -->
      <motion.div
        class="be-range-bubble-thumb"
        :style="{ left, x: '-50%', y: '-50%' }"
        :initial="false"
        :animate="reduce ? undefined : { scale: dragging ? 1.25 : 1 }"
        :transition="SPRING_PRESS"
      />

      <!-- bubble — anchored to the thumb, leaning with drag velocity -->
      <motion.div class="be-range-bubble-anchor" :style="{ left, x: '-50%' }">
        <AnimatePresence>
          <motion.div
            v-if="dragging"
            class="be-range-bubble-pop"
            :initial="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, y: 10 }"
            :animate="reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }"
            :exit="reduce ? { opacity: 0, transition: { duration: 0.12 } } : { opacity: 0, scale: 0.5, y: 8, transition: { duration: 0.12 } }"
            :transition="reduce ? { duration: 0.12 } : SPRING_PANEL"
            :style="reduce ? undefined : { rotate: tilt, scaleX: squash, scaleY: stretch, originY: 1 }"
          >
            {{ format ? format(current) : current }}
            <span class="be-range-bubble-tail" />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <!-- 8px of track is not a touch target — pad the hit area out to 48px -->
      <button ref="sliderRef" type="button" v-bind="aria" class="be-range-bubble-button" @keydown="onKeyDown" />
    </div>
  </div>
</template>

<style scoped>
.be-range-bubble { position: relative; display: flex; box-sizing: border-box; width: 100%; height: 5rem; align-items: flex-end; padding: 0 1.25rem 1.25rem; color: var(--beui-foreground); }
.be-range-bubble-disabled { pointer-events: none; opacity: .5; }
.be-range-bubble-track {
  position: relative; width: 100%; height: .5rem; border-radius: 999px; background: var(--beui-muted); touch-action: none; user-select: none;
  -webkit-user-select: none; -webkit-touch-callout: none; cursor: grab;
}
.be-range-bubble-track:active { cursor: grabbing; }
.be-range-bubble-fill { position: absolute; top: 0; bottom: 0; left: 0; border-radius: 999px; background: var(--beui-foreground); }
.be-range-bubble-thumb { position: absolute; top: 50%; box-sizing: border-box; width: 1.25rem; height: 1.25rem; border: 2px solid var(--beui-foreground); border-radius: 999px; background: var(--beui-background); box-shadow: 0 1px 2px 0 rgb(0 0 0 / .05); }
.be-range-bubble-anchor { position: absolute; bottom: 1.5rem; pointer-events: none; }
.be-range-bubble-pop {
  position: relative; padding: .25rem .625rem; border-radius: .75rem; background: var(--beui-foreground); color: var(--beui-background);
  font-size: .875rem; line-height: 1.25rem; font-weight: 500; font-variant-numeric: tabular-nums; box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1);
}
.be-range-bubble-tail { position: absolute; bottom: -.25rem; left: 50%; width: .625rem; height: .625rem; transform: translateX(-50%) rotate(45deg); border-radius: 3px; background: var(--beui-foreground); }
.be-range-bubble-button { position: absolute; top: -1.25rem; bottom: -1.25rem; left: 0; right: 0; margin: 0; padding: 0; border: 0; border-radius: 999px; background: none; outline: none; touch-action: none; }
.be-range-bubble-button:focus-visible { box-shadow: 0 0 0 4px color-mix(in srgb, var(--beui-foreground) 30%, transparent); }
</style>

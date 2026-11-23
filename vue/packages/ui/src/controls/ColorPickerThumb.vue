<script setup lang="ts">
import { AnimatePresence, motion, useSpring, useTransform, useVelocity, type MotionValue } from 'motion-v'
import { computed } from 'vue'
import { easeOut, pressSpring } from '../core/motion'
import { useReducedMotion } from '../core/reduced-motion'

/**
 * The draggable thumb shared by `ColorPickerArea` and the channel sliders. While dragged it
 * shrinks, and a loupe lifts above it showing the colour under the pointer and swinging with
 * the drag. Internal: not exported from the package.
 */
const props = defineProps<{
  dragging: boolean
  color: string
  /** Horizontal glide spring, read for the loupe's tilt. */
  glide: MotionValue<number>
  x: MotionValue<string>
  y?: MotionValue<string>
}>()
defineOptions({ inheritAttrs: false })

const reduce = useReducedMotion()
// The loupe lifts with a visible overshoot so it reads as picked up, unlike
// the critically damped glide the thumb itself rides on.
const LOUPE_LIFT = { type: 'spring', stiffness: 520, damping: 24, mass: 0.6 } as const
const LOUPE_DROP = { duration: 0.12, ease: easeOut } as const
// Glide velocity in %/s mapped to a pendulum swing, so the loupe trails the drag.
const LOUPE_TILT_INPUT = [-400, 400]
const LOUPE_TILT_DEGREES = [16, -16]
const velocity = useVelocity(props.glide)
const tilt = useSpring(useTransform(velocity, LOUPE_TILT_INPUT, LOUPE_TILT_DEGREES, { clamp: true }), pressSpring)
const lifted = computed(() => props.dragging && !reduce.value)
const offset = computed(() => (props.y ? { x: props.x, y: props.y } : { x: props.x }))
</script>

<template>
  <motion.div class="be-picker-thumb-plane" :style="offset">
    <!-- Attributes (role, aria-*, tabindex, keydown) land on the focusable thumb. -->
    <div class="be-picker-thumb-zone" :class="{ 'is-centered': !y }" v-bind="$attrs">
      <motion.span
        class="be-picker-thumb" aria-hidden="true" :animate="{ scale: lifted ? 0.78 : 1 }" :transition="pressSpring"
        :style="{ backgroundColor: color }" />
      <AnimatePresence>
        <motion.span
          v-if="lifted" class="be-picker-loupe" aria-hidden="true" :style="{ rotate: tilt, originX: 0.5, originY: 1.3 }"
          :initial="{ opacity: 0, scale: 0.3, y: 16 }" :animate="{ opacity: 1, scale: 1, y: 0, transition: LOUPE_LIFT }"
          :exit="{ opacity: 0, scale: 0.3, y: 16, transition: LOUPE_DROP }">
          <!-- A square with one sharp corner, turned so the point aims at the thumb. -->
          <span class="be-picker-loupe-square"><span class="be-picker-loupe-fill" :style="{ background: color }" /></span>
        </motion.span>
      </AnimatePresence>
    </div>
  </motion.div>
</template>

<style>
.be-picker-thumb-plane { position: absolute; inset: 0; pointer-events: none; }
.be-picker-thumb-zone { position: absolute; left: 0; top: 0; width: 1.125rem; height: 1.125rem; border-radius: 50%; outline: none; transform: translate(-50%, -50%); }
.be-picker-thumb-zone.is-centered { top: 50%; }
.be-picker-thumb-zone:focus-visible { outline: 2px solid var(--beui-foreground); outline-offset: 2px; }
.be-picker-thumb { display: block; width: 100%; height: 100%; box-sizing: border-box; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / .12), 0 2px 6px rgb(0 0 0 / .25); }
.be-picker-loupe { pointer-events: none; position: absolute; bottom: calc(100% + 12px); left: 50%; z-index: 10; margin-left: -1.25rem; display: block; width: 2.5rem; height: 2.5rem; }
.be-picker-loupe-square { position: absolute; inset: 0; box-sizing: border-box; overflow: hidden; border: 3px solid white; border-radius: 50% 50% 50% 0; box-shadow: 0 0 0 1px rgb(0 0 0 / .1), 0 6px 16px rgb(0 0 0 / .28); transform: rotate(-45deg); background: repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px; }
.be-picker-loupe-fill { position: absolute; inset: 0; }
</style>

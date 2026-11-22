<script setup lang="ts">
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { toRef, useTemplateRef, watchEffect } from 'vue'

const { speed = .3, axis = 'y', spring = true, container } = defineProps<{
  /**
   * Drift as a fraction of the element's travel through the viewport.
   * Positive moves with the scroll (foreground), negative against it
   * (background). ~0.1–0.5 reads best.
   */
  speed?: number
  axis?: 'x' | 'y'
  /** Scroll container element for contained scroll areas. Defaults to the viewport. */
  container?: HTMLElement | null
  /** Spring-smooth the drift. Disabled automatically under reduced motion. */
  spring?: boolean
}>()
defineSlots<{ default?: () => unknown }>()

// The moving element is the root itself, so a `class` lands on the layer that drifts.
const target = useTemplateRef('target')
const reduce = useReducedMotion()
const { scrollYProgress } = useScroll({
  target,
  container: toRef(() => container ?? undefined),
  offset: ['start end', 'end start'],
})

// Progress 0→1 as the element crosses the viewport, mapped to a symmetric drift.
const travel = useMotionValue(speed * 100)
watchEffect(() => travel.set(speed * 100))
const drift = useTransform(() => (1 - 2 * scrollYProgress.get()) * travel.get())
// Soft follow so the drift trails the scroll smoothly; looser than the UI springs on purpose.
const smoothed = useSpring(drift, { stiffness: 120, damping: 30, mass: .6 })
</script>

<template>
  <motion.div ref="target" :style="reduce ? {} : { [axis]: spring ? smoothed : drift }"><slot /></motion.div>
</template>

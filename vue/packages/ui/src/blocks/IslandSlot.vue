<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut } from '../core/motion'

/**
 * One piece of island content (the compact pill or a view). It enters with the
 * shell spring and is sucked back up into the pill on exit. Used only by
 * `DynamicIsland` and `DynamicIslandView`.
 */
// Content gets a touch more life than the shell.
const CONTENT_SPRING = { type: 'spring', duration: 0.8, bounce: 0.35 } as const
const reduce = useReducedMotion()
</script>

<template>
  <motion.div
    class="be-island-slot"
    :initial="reduce ? { opacity: 0, filter: 'blur(0px)' } : { opacity: 0, scale: 0.9, y: -8, filter: 'blur(5px)' }"
    :animate="reduce ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }"
    :exit="reduce
      ? { opacity: 0, filter: 'blur(0px)', transition: { duration: 0.1 } }
      : { opacity: 0, scale: 0.9, y: -6, filter: 'blur(0px)', transition: { duration: 0.08, ease: easeOut } }"
    :transition="reduce ? { duration: 0.15 } : CONTENT_SPRING"
    style="transform-origin: top center">
    <slot />
  </motion.div>
</template>

<style scoped>
.be-island-slot { display: flex; align-items: center; justify-content: center; }
</style>

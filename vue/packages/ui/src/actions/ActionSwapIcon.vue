<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut, swapSpring } from '../core/motion'

/**
 * The icon half of `ActionSwap`: swaps its content when `value` changes. Cascade maps to its
 * closest motion for a single element, roll. Size it with `class` (for example 16x16).
 */
const props = withDefaults(defineProps<{
  /** Identity of the current icon. Changing it plays the swap. */
  value: string
  animation?: 'blur' | 'roll' | 'cascade'
}>(), { animation: 'blur' })
defineSlots<{
  /** The icon. */
  default?(): unknown
}>()
const reduce = useReducedMotion()
const core = computed<'blur' | 'roll'>(() => (props.animation === 'cascade' ? 'roll' : props.animation))
const SWAP_BLUR = 'blur(2px)'
const ROLL_BLUR = 'blur(3px)'
const motionFor = computed(() => core.value === 'blur'
  ? {
      initial: { opacity: 0, scale: 0.25, filter: SWAP_BLUR },
      animate: { opacity: 1, scale: 1, filter: 'blur(0px)', transition: swapSpring },
      exit: { opacity: 0, scale: 0.25, filter: SWAP_BLUR, transition: { duration: 0.16, ease: easeOut } },
    }
  : {
      initial: { opacity: 0, y: 12, filter: ROLL_BLUR },
      animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: swapSpring },
      exit: { opacity: 0, y: -12, filter: ROLL_BLUR, transition: { duration: 0.14, ease: easeOut } },
    })
const settled = { opacity: 1, filter: 'blur(0px)', scale: 1, y: 0 }
</script>

<template>
  <span class="be-swap-icon">
    <AnimatePresence mode="popLayout" :initial="false">
      <motion.span
        :key="`${animation}-${value}`"
        aria-hidden="true"
        class="be-swap-glyph"
        :initial="reduce ? false : motionFor.initial"
        :animate="reduce ? settled : motionFor.animate"
        :exit="reduce ? undefined : motionFor.exit"
      ><slot /></motion.span>
    </AnimatePresence>
  </span>
</template>

<style scoped>
.be-swap-icon { position: relative; display: inline-grid; flex-shrink: 0; place-items: center; overflow: hidden; }
.be-swap-glyph { grid-area: 1 / 1; display: inline-flex; align-items: center; justify-content: center; will-change: opacity, filter, transform; }
</style>

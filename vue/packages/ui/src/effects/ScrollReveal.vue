<script setup lang="ts">
import { motion, useInView } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, useTemplateRef } from 'vue'
import { easeOut } from '../core/motion'

const { y = 16, blur = 8, duration = .6, delay = 0, once = true, amount = .3, root } = defineProps<{
  /** Slide distance in px before reveal. */
  y?: number
  /** Enter blur in px (kept ≤ 10 per motion conventions). */
  blur?: number
  /** Reveal duration in seconds. */
  duration?: number
  delay?: number
  /** Reveal only once (default) or every time it enters view. */
  once?: boolean
  /** Portion of the element that must be visible to trigger. */
  amount?: 'some' | 'all' | number
  /** Scroll root element for contained scroll areas. Defaults to the viewport. */
  root?: Element | null
}>()
defineSlots<{ default?: () => unknown }>()

const target = useTemplateRef('target')
const reduce = useReducedMotion()
const inView = useInView(target, computed(() => ({ root: root ?? undefined, once, amount })))

// Reduced motion keeps the opacity fade and drops the movement and blur. The same
// keys stay in both states, so a late preference change never strands an offset.
const hidden = computed(() => reduce.value ? { opacity: 0, y: 0, filter: 'blur(0px)' } : { opacity: 0, y, filter: `blur(${blur}px)` })
const shown = { opacity: 1, y: 0, filter: 'blur(0px)' }
const initial = { opacity: 0, y, filter: `blur(${blur}px)` }
</script>

<template>
  <motion.div ref="target" :initial="initial" :animate="inView ? shown : hidden" :transition="{ duration, ease: easeOut, delay }"><slot /></motion.div>
</template>

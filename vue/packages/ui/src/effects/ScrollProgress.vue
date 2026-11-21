<script setup lang="ts">
import { motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, toRef, watchEffect } from 'vue'
import { useSmoothScroll } from '../layout/scroll-context'

const { progress, container, spring = true, variant = 'bar', position = 'top', height = 2, fixed = true, size = 40, thickness = 3 } = defineProps<{
  progress?: number | MotionValue<number>; container?: HTMLElement | null; spring?: boolean; variant?: 'bar' | 'circle'; position?: 'top' | 'bottom'; height?: number; fixed?: boolean; size?: number; thickness?: number
}>()
const reduce = useReducedMotion()
const provider = useSmoothScroll()
const { scrollYProgress } = useScroll({ container: toRef(() => container ?? provider?.container.value) })
const raw = useMotionValue(0)
const smooth = useSpring(raw, { stiffness: 120, damping: 30, mass: .6 })
watchEffect(cleanup => {
  const input = progress ?? (!container && provider ? provider.progress : scrollYProgress)
  const update = (next: number) => raw.set(Math.min(1, Math.max(0, next)))
  if (typeof input === 'number') update(input)
  else { update(input.get()); cleanup(input.on('change', update)) }
})
const value = computed(() => spring && !reduce.value ? smooth : raw)
const radius = computed(() => Math.max(0, (size - thickness) / 2))
const rawOffset = useTransform(raw, progress => 1 - progress)
const smoothOffset = useTransform(smooth, progress => 1 - progress)
</script>
<template>
  <svg v-if="variant === 'circle'" aria-hidden="true" focusable="false" :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="progress-circle">
    <circle :cx="size / 2" :cy="size / 2" :r="radius" :stroke-width="thickness" opacity=".15" />
    <motion.circle :cx="size / 2" :cy="size / 2" :r="radius" :stroke-width="thickness" pathLength="1" stroke-dasharray="1" stroke-linecap="round"
      :style="{ strokeDashoffset: spring && !reduce ? smoothOffset : rawOffset }" :transform="`rotate(-90 ${size / 2} ${size / 2})`" />
  </svg>
  <motion.div v-else aria-hidden="true" class="progress-bar" :style="{ position: fixed ? 'fixed' : 'absolute', [position]: 0, height: `${height}px`, scaleX: value }" />
</template>
<style scoped>
.progress-bar { z-index: 50; left: 0; right: 0; background: var(--beui-foreground); transform-origin: left; pointer-events: none; }
.progress-circle { fill: none; stroke: currentColor; color: var(--beui-foreground); }
</style>

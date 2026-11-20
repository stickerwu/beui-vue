<script setup lang="ts">
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion-v'
import { toRef, useTemplateRef, watchEffect } from 'vue'

const { speed = .3, axis = 'y', spring = true, container } = defineProps<{ speed?: number; axis?: 'x' | 'y'; spring?: boolean; container?: HTMLElement | null }>()
const target = useTemplateRef('target')
const { scrollYProgress } = useScroll({ target, container: toRef(() => container ?? undefined), offset: ['start end', 'end start'] })
const travel = useMotionValue(speed * 100)
watchEffect(() => travel.set(speed * 100))
const mapped = useTransform(() => (1 - 2 * scrollYProgress.get()) * travel.get())
const smoothed = useSpring(mapped, { stiffness: 120, damping: 30, mass: .6 })
const reduce = useReducedMotion()
</script>
<template><div ref="target" class="parallax-target"><motion.div class="parallax-content" :style="{ [axis]: reduce ? 0 : spring ? smoothed : mapped }"><slot /></motion.div></div></template>
<style scoped>.parallax-content { width: 100%; height: 100%; display: inherit; align-items: inherit; justify-content: inherit; place-items: inherit; }</style>

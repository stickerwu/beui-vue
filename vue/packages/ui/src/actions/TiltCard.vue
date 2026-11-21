<script setup lang="ts">
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { useTemplateRef } from 'vue'
import { useMountedMedia } from '../core/mounted-media'
import { mouseSpring } from '../core/motion'

const props = withDefaults(defineProps<{ max?: number; glare?: boolean; className?: string }>(), { max: 12, glare: true })

const target = useTemplateRef<{ $el?: HTMLElement } | HTMLElement>('target')
const reduce = useReducedMotion()
// Decorative cursor-follow: skip on touch (phantom hover) and reduced motion.
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
const enabled = () => !reduce.value && canHover.value

const rx = useMotionValue(0)
const ry = useMotionValue(0)
const gx = useMotionValue(50)
const gy = useMotionValue(50)
const srx = useSpring(rx, mouseSpring)
const sry = useSpring(ry, mouseSpring)
const transform = useMotionTemplate`perspective(1000px) rotateX(${srx}deg) rotateY(${sry}deg)`
const glareBackground = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, var(--beui-foreground), transparent 50%)`

function move(event: PointerEvent) {
  // A motion component ref is the component instance; the card element is its $el.
  const element = (target.value && '$el' in target.value ? target.value.$el : target.value) as HTMLElement | null | undefined
  if (!element || !enabled()) return
  const rect = element.getBoundingClientRect()
  const px = (event.clientX - rect.left) / rect.width
  const py = (event.clientY - rect.top) / rect.height
  ry.set((px - .5) * props.max)
  rx.set((.5 - py) * props.max)
  gx.set(px * 100)
  gy.set(py * 100)
}
function leave() {
  rx.set(0)
  ry.set(0)
}
</script>

<template>
  <motion.div
    ref="target"
    class="be-tilt"
    :class="className"
    :style="{ transform, transformStyle: 'preserve-3d' }"
    @pointermove="move"
    @pointerleave="leave"
  >
    <slot />
    <motion.div v-if="glare && canHover && !reduce" aria-hidden="true" class="be-tilt-glare" :style="{ background: glareBackground }" />
  </motion.div>
</template>

<style scoped>
.be-tilt { position: relative; overflow: hidden; border-radius: 1rem; will-change: transform; }
.be-tilt-glare { position: absolute; inset: 0; pointer-events: none; opacity: .15; }
</style>

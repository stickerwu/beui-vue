<script setup lang="ts">
/** A row label that scrolls horizontally while the row is hovered, when it overflows. */
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { easeOut } from '../core/motion'

const props = defineProps<{ active: boolean }>()
const reduce = useReducedMotion()
const viewport = useTemplateRef<HTMLElement>('viewport')
const label = useTemplateRef<HTMLElement>('label')
const distance = shallowRef(0)
let observer: ResizeObserver | undefined

function measure() {
  const box = viewport.value
  const text = label.value
  if (!box || !text) return
  distance.value = text.scrollWidth > box.clientWidth ? text.scrollWidth + 24 : 0
}
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (viewport.value) observer.observe(viewport.value)
  if (label.value) observer.observe(label.value)
})
onBeforeUnmount(() => observer?.disconnect())

const running = computed(() => props.active && distance.value > 0 && !reduce.value)
const animate = computed(() => ({ x: running.value ? [0, -distance.value] : 0 }))
const transition = computed(() => running.value
  ? { duration: Math.max(2.4, distance.value / 34), ease: 'linear' as const, repeat: Infinity, repeatDelay: 2 }
  : { duration: 0.16, ease: easeOut })
</script>

<template>
  <span ref="viewport" class="be-marquee"><motion.span class="be-marquee-track" :animate="animate" :transition="transition"><span ref="label"><slot /></span><span v-if="running" aria-hidden="true"><slot /></span></motion.span></span>
</template>

<style scoped>
.be-marquee { display: block; min-width: 0; flex: 1 1 0%; overflow: hidden; }
.be-marquee-track { display: flex; width: max-content; align-items: center; gap: 1.5rem; white-space: nowrap; }
</style>

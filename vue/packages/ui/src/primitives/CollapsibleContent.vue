<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'
import { layoutSpring, useCollapsible } from './state'

defineProps<{ contentClassName?: string }>()
const { open, contentId, triggerId } = useCollapsible()
const reduce = useReducedMotion()
const inner = useTemplateRef<{ $el?: HTMLElement } | HTMLElement>('inner')
// The measured content height. The clipping box takes it as an explicit pixel height, so the one
// layout animation reshapes the box once while the inner layer's own projection keeps the text sharp.
const height = shallowRef(0)
const element = () => (inner.value && '$el' in inner.value ? inner.value.$el : inner.value) as HTMLElement | null | undefined
let observer: ResizeObserver | undefined
onMounted(() => {
  const node = element()
  if (!node) return
  const measure = () => { height.value = node.offsetHeight }
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(node)
})
onBeforeUnmount(() => observer?.disconnect())
watch(open, visible => {
  const node = element()
  const doc = node?.ownerDocument
  if (!visible && doc && node?.contains(doc.activeElement)) doc.getElementById(triggerId)?.focus({ preventScroll: true })
})
// A one-pixel closed box keeps transform projection continuous at zero.
const boxHeight = computed(() => (open.value ? (height.value ? `${height.value}px` : 'auto') : '1px'))
</script>

<template>
  <motion.div
    :id="contentId" role="region" :aria-labelledby="triggerId" :aria-hidden="!open" :inert="!open" data-slot="collapsible-content" :data-state="open ? 'open' : 'closed'"
    class="be-collapse-content" :initial="false" :layout="!reduce" :transition="{ layout: layoutSpring }" :style="{ height: boxHeight, transformOrigin: '50% 0%' }"
  >
    <motion.div
      ref="inner" class="be-collapse-body" :class="contentClassName" :layout="!reduce" :style="{ transformOrigin: '50% 0%' }" :initial="false"
      :animate="{ opacity: open ? 1 : 0 }" :transition="{ opacity: { duration: open ? 0.18 : 0.12, ease: easeOut }, layout: layoutSpring }"
    ><slot /></motion.div>
  </motion.div>
</template>

<style scoped>
.be-collapse-content { overflow: hidden; }
.be-collapse-body { display: flow-root; }
</style>

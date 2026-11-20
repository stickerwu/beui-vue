<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { shallowRef, watch } from 'vue'
import { layoutSpring, useCollapsible } from './state'

defineProps<{ contentClassName?: string }>()
const { open, contentId, triggerId } = useCollapsible()
const reduce = useReducedMotion()
const inner = shallowRef<HTMLElement | null>(null)
watch(open, visible => {
  const doc = inner.value?.ownerDocument
  if (!visible && doc && inner.value?.contains(doc.activeElement)) doc.getElementById(triggerId)?.focus({ preventScroll: true })
})
</script>

<template>
  <motion.div :id="contentId" role="region" :aria-labelledby="triggerId" :aria-hidden="!open" :inert="!open" data-slot="collapsible-content" :data-state="open ? 'open' : 'closed'" class="be-collapse-content" :layout="!reduce" :transition="layoutSpring">
    <div ref="inner" class="be-collapse-body" :class="contentClassName"><slot /></div>
  </motion.div>
</template>

<style scoped>
.be-collapse-content { overflow: hidden; transform-origin: top; }
.be-collapse-content[data-state=closed] { height: 1px; }
.be-collapse-body { display: flow-root; opacity: 1; transition: opacity .18s; }
.be-collapse-content[data-state=closed] .be-collapse-body { opacity: 0; transition-duration: .12s; }
</style>

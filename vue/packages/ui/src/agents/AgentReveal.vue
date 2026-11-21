<script setup lang="ts">
/** Transform-only reveal for collapsible agent content (the upstream `AgentDisclosure`). */
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed } from 'vue'
import { easeOut } from '../core/motion'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ open: boolean, openHeight?: string | number }>(), { openHeight: 'auto' })
const reduce = useReducedMotion()
const animate = computed(() => reduce.value
  ? { opacity: props.open ? 1 : 0 }
  : { opacity: props.open ? 1 : 0, clipPath: props.open ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)', y: props.open ? 0 : -4 })
const transition = computed(() => ({ duration: reduce.value ? 0 : props.open ? 0.22 : 0.14, ease: easeOut }))
const height = computed(() => props.open ? (typeof props.openHeight === 'number' ? `${props.openHeight}px` : props.openHeight) : '0px')
</script>

<template>
  <motion.div v-bind="$attrs" class="be-reveal" :aria-hidden="!open" :inert="!open" :initial="false" :animate="animate" :transition="transition" :style="{ height, pointerEvents: open ? undefined : 'none', transformOrigin: 'top' }"><slot /></motion.div>
</template>

<style scoped>
.be-reveal { overflow: hidden; }
</style>

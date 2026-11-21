<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, provide, useId } from 'vue'
import { collapsibleKey, layoutSpring, useOpenState } from './state'

const props = withDefaults(defineProps<{ open?: boolean, defaultOpen?: boolean, disabled?: boolean, contentClassName?: string }>(), { open: undefined, defaultOpen: false })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, value => {
  emit('update:open', value)
  emit('openChange', value)
}, () => props.disabled)
const id = useId()
const reduce = useReducedMotion()
const toggle = () => setOpen(!open.value)
provide(collapsibleKey, { open, setOpen, toggle, disabled: computed(() => props.disabled), triggerId: `${id}-trigger`, contentId: `${id}-content` })
</script>

<template>
  <motion.div class="be-collapse" data-slot="collapsible" :data-state="open ? 'open' : 'closed'" :data-disabled="disabled || undefined" :layout="!reduce" :transition="layoutSpring">
    <motion.div class="be-collapse-inner" :class="contentClassName" :layout="reduce ? false : 'position'" :transition="layoutSpring"><slot :open="open" :disabled="disabled" :set-open="setOpen" :toggle="toggle" /></motion.div>
  </motion.div>
</template>

<style scoped>
.be-collapse { position: relative; width: 100%; transform-origin: top; }
.be-collapse-inner { min-width: 0; transform-origin: top; }
</style>

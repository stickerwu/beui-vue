<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { layoutSpring, useCollapsible } from './state'
const { open } = useCollapsible()
const reduce = useReducedMotion()
</script>

<template>
  <motion.span aria-hidden="true" class="be-collapse-indicator" data-slot="collapsible-indicator" :initial="false" :animate="{ rotate: open ? 180 : 0 }" :transition="reduce ? { duration: 0 } : layoutSpring">
    <slot><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg></slot>
  </motion.span>
</template>

<style scoped>
.be-collapse-indicator { display: inline-flex; flex: none; align-items: center; justify-content: center; margin-inline-start: auto; color: var(--beui-muted-foreground); }
</style>

<script setup lang="ts">
import { motion } from 'motion-v'
import { easeOut } from '../core/motion'

/** A small ring that fills with the chance the next pick is safe. */
defineProps<{ safe: number; reduce: boolean }>()
</script>

<template>
  <svg aria-hidden="true" viewBox="0 0 14 14" class="ring">
    <circle cx="7" cy="7" r="5.5" fill="none" stroke-width="2" class="mo-track" />
    <motion.circle cx="7" cy="7" r="5.5" fill="none" stroke-width="2" stroke-linecap="round" :class="['mo-arc', { low: safe < 0.5 }]"
      :initial="false" :animate="{ pathLength: safe }" :transition="reduce ? { duration: 0 } : { duration: 0.2, ease: easeOut }" />
  </svg>
</template>

<style scoped>
.ring { width: 14px; height: 14px; transform: rotate(-90deg); }
.mo-track { stroke: color-mix(in srgb, var(--beui-foreground) 10%, transparent); }
.mo-arc { stroke: var(--beui-primary); }
.mo-arc.low { stroke: #f43f5e; }
:global(.dark .mo-arc.low) { stroke: #fb7185; }
</style>

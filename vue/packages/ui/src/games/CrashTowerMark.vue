<script setup lang="ts">
import { motion } from 'motion-v'
import { EXIT } from './game-parts'
import { easeOut } from '../core/motion'
import { BASE } from './crash-tower'

/** A dashed height line across the tower column; it sinks with the camera and fades out. */
const { rise, ceiling, label, tone } = defineProps<{ rise: number; ceiling: number; label: string; tone: 'ghost' | 'target' }>()
</script>

<template>
  <!-- `y` is a transform, so the per-frame sink never touches layout. -->
  <motion.div class="crash-mark" :data-tone="tone" :style="{ bottom: `${BASE}px`, y: -Math.min(rise, ceiling) }"
    :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0, transition: EXIT }" :transition="{ duration: 0.15, ease: easeOut }">
    <span class="mark-label">{{ rise > ceiling ? '↑ ' : '' }}{{ label }}</span>
  </motion.div>
</template>

<style scoped>
.crash-mark { position: absolute; right: 12px; left: calc(72% - 3.5rem); border-top: 1px dashed; }
.crash-mark[data-tone='ghost'] { border-color: color-mix(in oklab, var(--beui-muted-foreground) 30%, transparent); color: var(--beui-muted-foreground); }
.crash-mark[data-tone='target'] { border-color: color-mix(in oklab, var(--beui-primary) 70%, transparent); color: color-mix(in oklab, var(--beui-primary) 75%, black); }
:global(.dark .crash-mark[data-tone='target']) { color: color-mix(in oklab, var(--beui-primary) 80%, white); }
:global([data-beui-theme='dark'] .crash-mark[data-tone='target']) { color: color-mix(in oklab, var(--beui-primary) 80%, white); }
.mark-label { position: absolute; right: 0; bottom: 2px; font-size: 10px; line-height: 1; font-weight: 500; font-variant-numeric: tabular-nums; white-space: nowrap; }
</style>

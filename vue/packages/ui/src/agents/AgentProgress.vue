<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { easeInOut } from '../core/motion'
import type { Labels } from './shared'

const props = withDefaults(defineProps<{ label?: string, elapsedSeconds?: number, initialSeconds?: number, running?: boolean, labels?: Labels }>(), { initialSeconds: 0, running: true })
const CELL_DELAYS = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 0.98, 1.12]
const reduce = useReducedMotion()
const label = computed(() => props.label ?? props.labels?.churning ?? 'Churning')
const seconds = shallowRef(props.initialSeconds)
const elapsed = computed(() => {
  const value = Math.max(0, props.elapsedSeconds ?? seconds.value)
  const minutes = Math.floor(value / 60)
  const remainder = (value % 60).toFixed(1)
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`
})
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  watch([() => props.elapsedSeconds, () => props.initialSeconds, () => props.running], ([controlled, initial, running], _, cleanup) => {
    if (controlled !== undefined || !running) return
    const startedAt = performance.now() - initial * 1000
    timer = setInterval(() => { seconds.value = (performance.now() - startedAt) / 1000 }, 100)
    cleanup(() => clearInterval(timer))
  }, { immediate: true })
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <span class="ap" role="status" :aria-label="(labels?.inProgress ?? '{label}, in progress').replace('{label}', label)">
    <span class="ap-grid" aria-hidden="true">
      <motion.span
        v-for="(delay, cell) in CELL_DELAYS" :key="cell" class="ap-cell"
        :animate="reduce ? { opacity: [0.35, 0.8, 0.35], scale: 1 } : { opacity: [0.28, 1, 0.28], scale: [0.72, 1, 0.72] }"
        :transition="reduce ? { opacity: { duration: 1.55, ease: easeInOut, repeat: Infinity, delay }, scale: { duration: 0 } } : { duration: 1.55, ease: easeInOut, repeat: Infinity, delay }"
      />
    </span>
    <span class="ap-label">{{ label }}</span>
    <span class="ap-time" aria-hidden="true">{{ elapsed }}</span>
  </span>
</template>

<style scoped>
.ap { display: inline-flex; align-items: center; gap: .75rem; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.ap-grid { display: grid; width: 1.25rem; height: 1.25rem; flex: none; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2px; }
.ap-cell { border-radius: 1px; background: currentColor; }
.ap-label { font-weight: 500; }
.ap-time { font-family: var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums; color: color-mix(in oklab, var(--beui-muted-foreground) 70%, transparent); }
</style>

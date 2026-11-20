<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import type { Labels } from './shared'
const props = withDefaults(defineProps<{ label?: string, elapsedSeconds?: number, initialSeconds?: number, running?: boolean, labels?: Labels }>(), { initialSeconds: 0, running: true })
const label = computed(() => props.label ?? props.labels?.churning ?? 'Churning')
const seconds = shallowRef(props.initialSeconds)
const elapsed = computed(() => {
  const value = Math.max(0, props.elapsedSeconds ?? seconds.value)
  const minutes = Math.floor(value / 60)
  return `${minutes ? `${minutes}m ` : ''}${(value % 60).toFixed(1)}s`
})
onMounted(() => watch(() => [props.running, props.elapsedSeconds, props.initialSeconds] as const, ([running, controlled, initial], previous, clean) => {
  if (!previous || previous[2] !== initial) seconds.value = initial
  if (!running || controlled !== undefined) return
  const started = performance.now() - seconds.value * 1000
  const timer = setInterval(() => { seconds.value = (performance.now() - started) / 1000 }, 100)
  clean(() => clearInterval(timer))
}, { immediate: true }))
</script>
<template><span class="be-progress" role="status" :aria-label="(labels?.inProgress ?? '{label}, in progress').replace('{label}',label)"><span class="be-progress-grid" aria-hidden="true"><i v-for="cell in 9" :key="cell" :style="{ animationDelay: `${(cell - 1) * .14}s` }" /></span><strong>{{ label }}</strong><span aria-hidden="true">{{ elapsed }}</span></span></template>
<style scoped>.be-progress{display:inline-flex;align-items:center;gap:.75rem;color:var(--beui-muted-foreground);font: .875rem ui-monospace,monospace;font-variant-numeric:tabular-nums}.be-progress strong{font-family:system-ui;font-weight:500}.be-progress-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;width:1.25rem;height:1.25rem}.be-progress-grid i{border-radius:1px;background:currentColor;animation:be-cell 1.55s ease-in-out infinite}@keyframes be-cell{0%,100%{opacity:.28;transform:scale(.72)}50%{opacity:1;transform:scale(1)}}@media(prefers-reduced-motion:reduce){.be-progress-grid i{animation:none;opacity:.65}}</style>

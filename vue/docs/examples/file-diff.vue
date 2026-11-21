<script setup lang="ts">
import { FileDiff, type FileDiffLine } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'

const DIFF_LINES: FileDiffLine[] = [
  { id: '1', oldLine: 18, newLine: 18, content: 'export async function runTask() {' },
  { id: '2', type: 'removed', oldLine: 19, content: '  return execute(task);' },
  { id: '3', type: 'added', newLine: 19, content: '  const result = await execute(task);' },
  { id: '4', type: 'added', newLine: 20, content: '  return normalize(result);' },
  { id: '5', oldLine: 20, newLine: 21, content: '}' },
]
const INTERVAL = 360
const visible = shallowRef(0)
const done = shallowRef(false)
const run = shallowRef(0)
let timers: ReturnType<typeof setTimeout>[] = []
const lines = computed(() => DIFF_LINES.slice(0, visible.value))
const copyText = DIFF_LINES.map(line => line.content).join('\n')
function start() {
  timers.forEach(clearTimeout)
  visible.value = 0
  done.value = false
  timers = DIFF_LINES.map((_, index) => setTimeout(() => { visible.value = index + 1 }, index * INTERVAL + 180))
  timers.push(setTimeout(() => { done.value = true }, DIFF_LINES.length * INTERVAL + 480))
}
function replay() { run.value += 1; start() }
onMounted(start)
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>
<template>
  <div class="demo">
    <FileDiff :key="run" file="src/runner.ts" :lines="lines" :status="done ? 'complete' : 'streaming'" :copy-text="copyText" :max-height="150" />
    <button type="button" class="replay" @click="replay"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Replay</button>
  </div>
</template>
<style scoped>
.demo { position: relative; width: 100%; max-width: 32rem; height: 300px; }
.replay { position: absolute; bottom: 0; left: 0; display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; border: 0; border-radius: 0.375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; font-weight: 500; cursor: pointer; outline: none; transition: color 0.15s, background-color 0.15s; }
.replay:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.replay:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>

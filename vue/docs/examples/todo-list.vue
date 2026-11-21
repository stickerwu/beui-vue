<script setup lang="ts">
import { TodoList, type TodoItem } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'

const TASKS = ['Inspect the current data flow', 'Update the response schema', 'Add coverage for edge cases', 'Run checks and prepare the result']
const TICKS_PER_TASK = 4
const step = shallowRef(0)
const run = shallowRef(0)
let timer: ReturnType<typeof setTimeout> | undefined

const items = computed<TodoItem[]>(() => TASKS.map((title, index) => {
  const active = step.value >= index * TICKS_PER_TASK && step.value < (index + 1) * TICKS_PER_TASK
  const percent = ((step.value % TICKS_PER_TASK) + 1) * 25
  return {
    id: `task-${index}`,
    title,
    status: step.value >= (index + 1) * TICKS_PER_TASK ? 'completed' : step.value >= index * TICKS_PER_TASK ? 'in-progress' : 'pending',
    progress: active ? percent : undefined,
    detail: active ? `${percent}%` : undefined,
  }
}))
function tick() {
  clearTimeout(timer)
  if (step.value >= TASKS.length * TICKS_PER_TASK) return
  timer = setTimeout(() => { step.value += 1; tick() }, 280)
}
function replay() { step.value = 0; run.value += 1; tick() }
onMounted(tick)
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <div class="demo">
    <TodoList :key="run" :items="items" title="Implementation plan" />
    <button type="button" class="replay" @click="replay"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Replay</button>
  </div>
</template>
<style scoped>
.demo { position: relative; width: 100%; max-width: 32rem; height: 330px; }
.replay { position: absolute; bottom: 0; left: 0; display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; border: 0; border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; font-weight: 500; cursor: pointer; outline: none; transition: color 0.15s, background-color 0.15s; }
.replay:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.replay:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>

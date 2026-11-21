<script setup lang="ts">
import { CodeBlock } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'

const LINES = [
  'import { generateText } from "ai";',
  '',
  'export async function summarize(input: string) {',
  '  const { text } = await generateText({',
  '    model: "openai/gpt-5",',
  '    prompt: `Summarize this clearly: ${input}`,',
  '  });',
  '',
  '  return {',
  '    text,',
  '    generatedAt: new Date().toISOString(),',
  '  };',
  '}',
]
const visible = shallowRef(1)
const run = shallowRef(0)
let timer: ReturnType<typeof setTimeout> | undefined
const code = computed(() => LINES.slice(0, visible.value).join('\n'))
const complete = computed(() => visible.value === LINES.length)
function tick() {
  clearTimeout(timer)
  if (visible.value >= LINES.length) return
  timer = setTimeout(() => { visible.value += 1; tick() }, 260)
}
function replay() { visible.value = 1; run.value += 1; tick() }
onMounted(tick)
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <div class="demo">
    <CodeBlock filename="summarize.ts" language="typescript" :code="code" :status="complete ? 'complete' : 'streaming'" :highlight-lines="[4, 5, 6, 7]" :max-height="224" />
    <button type="button" class="replay" @click="replay"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Replay</button>
  </div>
</template>
<style scoped>
.demo { position: relative; width: 100%; max-width: 36rem; height: 340px; }
.replay { position: absolute; bottom: 0; left: 0; display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; border: 0; border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; font-weight: 500; cursor: pointer; outline: none; transition: color 0.15s, background-color 0.15s; }
.replay:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.replay:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>

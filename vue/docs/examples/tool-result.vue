<script setup lang="ts">
import { ToolResult, ToolResultOutput, AgentCode } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useAgentVariant } from '../.vitepress/use-agent-variant'

const props = defineProps<{ variant?: string }>()
const { variant, choose, options, fixed } = useAgentVariant(() => props.variant, {
  'terminal-output': 'agents/tool-result-terminal', 'request-result': 'agents/tool-result-request',
})
const OUTPUT = ['$ bun test tests/a11y.test.tsx', 'bun test v1.3.14', '✓ StreamingResponse complete', '✓ ToolApproval pending', '✓ Citations expanded', '49 pass · 0 fail']
const RESPONSE = '{\n  "error": "rate_limit_exceeded",\n  "retryAfter": 30,\n  "requestId": "req_8f21"\n}'
const PENDING = ['Preparing request…', 'GET /v1/activity\nConnecting…', 'GET /v1/activity\nWaiting for response…']

const isRequest = computed(() => variant.value === 'request-result')
const steps = computed(() => isRequest.value ? 3 : OUTPUT.length)
const visible = shallowRef(0)
const status = shallowRef<'running' | 'success' | 'error'>('running')
const run = shallowRef(0)
const mounted = shallowRef(false)
let timers: ReturnType<typeof setTimeout>[] = []

function start() {
  timers.forEach(clearTimeout)
  visible.value = 0
  status.value = 'running'
  const interval = isRequest.value ? 600 : 420
  timers = Array.from({ length: steps.value }, (_, index) => setTimeout(() => { visible.value = index + 1 }, index * interval + 180))
  timers.push(setTimeout(() => { status.value = isRequest.value ? 'error' : 'success' }, steps.value * interval + 480))
}
function replay() { run.value += 1 }
onMounted(() => { mounted.value = true })
watch([variant, run, mounted], () => { if (mounted.value) start() })
onBeforeUnmount(() => timers.forEach(clearTimeout))

const output = computed(() => OUTPUT.slice(0, visible.value).join('\n'))
const title = computed(() => isRequest.value
  ? status.value === 'running' ? 'Fetching project activity' : 'Request failed'
  : status.value === 'running' ? 'Running accessibility tests' : 'Tests passed')
const meta = computed(() => isRequest.value ? (status.value === 'error' ? '429' : 'GET /v1/activity') : (status.value === 'success' ? '2.9s' : undefined))
</script>
<template>
  <div class="demo" :data-example-variant="variant">
    <ToolResult :key="`${variant}-${run}`" :tool="isRequest ? 'http.request' : 'terminal.run'" :title="title" :kind="isRequest ? 'request' : 'terminal'" :status="status" :meta="meta" :copy-text="isRequest ? RESPONSE : output" :collapse-on-complete="!isRequest" :max-height="150" @retry="replay">
      <template v-if="isRequest">
        <ToolResultOutput v-if="visible < 3">{{ PENDING[visible] }}</ToolResultOutput>
        <AgentCode v-else :code="RESPONSE" language="json" />
      </template>
      <ToolResultOutput v-else>{{ output }}</ToolResultOutput>
    </ToolResult>
    <button type="button" class="replay" @click="replay"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Replay</button>
    <label v-if="!fixed" class="variant">Example <select :value="variant" @change="choose(($event.target as HTMLSelectElement).value)"><option v-for="option in options" :key="option">{{ option }}</option></select></label>
  </div>
</template>
<style scoped>
.demo { position: relative; width: 100%; max-width: 32rem; height: 330px; }
.replay { position: absolute; bottom: 0; left: 0; display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; border: 0; border-radius: 0.375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; font-weight: 500; cursor: pointer; outline: none; transition: color 0.15s, background-color 0.15s; }
.replay:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.replay:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.variant { position: absolute; right: 0; bottom: 0; display: inline-flex; align-items: center; gap: 0.375rem; color: var(--beui-muted-foreground); font-size: 0.75rem; }
.variant select { padding: 0.125rem 0.25rem; border: 1px solid var(--beui-border); border-radius: 0.375rem; background: var(--beui-background); color: var(--beui-foreground); font: inherit; }
</style>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ToolResult, ToolResultOutput } from 'beui-vue'
import { useAgentVariant } from '../.vitepress/use-agent-variant'
const props = defineProps<{variant?:string}>()
const {variant,choose,options} = useAgentVariant(() => props.variant,{
  'terminal-output':'agents/tool-result-terminal','request-result':'agents/tool-result-request',
})
const terminal = ['$ bun test tests/a11y.test.tsx','bun test v1.3.14','✓ StreamingResponse complete','✓ ToolApproval pending','✓ Citations expanded','49 pass · 0 fail']
const response = JSON.stringify({error:'rate_limit_exceeded',retryAfter:30,requestId:'req_8f21'},null,2)
const progress = ref(0)
const run = ref(0)
const mounted = ref(false)
const isRequest = computed(() => variant.value==='request-result')
const total = computed(() => isRequest.value ? 3 : terminal.length)
const finished = computed(() => progress.value >= total.value)
const runningText = ['Preparing request…','GET /v1/activity\nConnecting…','GET /v1/activity\nWaiting for response…']
const text = computed(() => isRequest.value ? finished.value ? response : runningText[progress.value] : terminal.slice(0,progress.value).join('\n'))
const status = computed(() => finished.value ? isRequest.value ? 'error' : 'success' : 'running')
onMounted(() => { mounted.value=true })
watch([variant,run,mounted],(_,__,cleanup) => {
  if (!mounted.value) return
  progress.value=0
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) { progress.value=total.value; return }
  const timer = setInterval(() => {
    progress.value++
    if (finished.value) clearInterval(timer)
  },isRequest.value ? 600 : 430)
  cleanup(() => clearInterval(timer))
})
</script>

<template>
  <div class="be-agent-demo be-block-stack" :data-example-variant="variant">
    <label>Example <select :value="variant" @change="choose(($event.target as HTMLSelectElement).value)"><option v-for="option in options" :key="option">{{ option }}</option></select></label>
    <ToolResult :key="`${variant}-${run}`" :tool="isRequest?'http.request':'terminal.run'" :kind="isRequest?'request':'terminal'" :status="status"
      :title="isRequest ? finished?'Request failed':'Fetching project activity' : finished?'Tests passed':'Running accessibility tests'"
      :meta="isRequest ? finished?'429':'GET /v1/activity' : finished?'2.9s':undefined" :copy-text="text" :collapse-on-complete="!isRequest" :max-height="150" @retry="run++">
      <ToolResultOutput>{{ text }}</ToolResultOutput>
    </ToolResult>
    <button type="button" class="be-agent-button" @click="run++">Replay</button>
  </div>
</template>

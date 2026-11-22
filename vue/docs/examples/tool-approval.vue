<script setup lang="ts">
import { ToolApproval, ToolApprovalCode, type ToolApprovalStatus } from 'beui-vue'
import { onBeforeUnmount, shallowRef } from 'vue'

const status = shallowRef<ToolApprovalStatus>('pending')
const detailsOpen = shallowRef(true)
const parameters = [
  { id: 'command', label: 'Command', value: 'bun test tests/a11y.test.tsx' },
  { id: 'directory', label: 'Directory', value: 'ui-components' },
]
let timers: ReturnType<typeof setTimeout>[] = []
function clear() { timers.forEach(clearTimeout); timers = [] }
function approve() {
  clear()
  status.value = 'approving'
  timers = [setTimeout(() => { status.value = 'approved' }, 600), setTimeout(() => { status.value = 'running' }, 1150), setTimeout(() => { status.value = 'complete' }, 2200)]
}
function deny() { clear(); status.value = 'denied' }
function replay() { clear(); status.value = 'pending'; detailsOpen.value = true }
onBeforeUnmount(clear)
</script>
<template>
  <div class="demo">
    <ToolApproval tool="terminal.run" :title="status === 'pending' ? 'Allow this tool to run?' : 'Terminal access'" description="The agent wants to run the project test suite in the current workspace." :status="status" v-model:open="detailsOpen" :parameters="parameters" @approve="approve" @always-allow="approve" @deny="deny">
      <template #parameter="{ parameter }"><ToolApprovalCode v-if="parameter.id === 'command'" :code="parameter.value" language="bash" /><template v-else>{{ parameter.value }}</template></template>
    </ToolApproval>
    <button type="button" class="replay" @click="replay"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Replay</button>
  </div>
</template>
<style scoped>
.demo { position: relative; width: 100%; max-width: 32rem; height: 360px; }
.replay { position: absolute; bottom: 0; left: 0; display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; border: 0; border-radius: 0.375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; font-weight: 500; cursor: pointer; outline: none; transition: color 0.15s, background-color 0.15s; }
.replay:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.replay:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>

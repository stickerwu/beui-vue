<script setup lang="ts">
import { watch } from 'vue'
import { useOpenState } from '../primitives/state'
import AgentDisclosure from './AgentDisclosure.vue'
import type { Labels } from './shared'
export type ToolApprovalStatus = 'pending' | 'approving' | 'approved' | 'denied' | 'running' | 'complete' | 'error'
const props = withDefaults(defineProps<{
  tool: string, title?: string, description?: string, status?: ToolApprovalStatus, parameters?: { id: string, label: string, value: string }[],
  open?: boolean, defaultOpen?: boolean, labels?: Labels, onAlwaysAllow?: () => void
}>(), { status: 'pending', parameters: () => [], open: undefined, defaultOpen: false })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean], approve: [], deny: [] }>()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
const statuses = { pending: 'Approval required', approving: 'Approving', approved: 'Approved', denied: 'Denied', running: 'Running', complete: 'Completed', error: 'Failed' }
watch(() => props.status, (next, previous) => { if (previous === 'pending' && next !== 'pending') setOpen(false) })
</script>
<template>
  <div class="be-agent-box be-agent-body be-tool-approval">
    <div class="be-agent-row"><strong>{{ title ?? tool }}</strong><span role="status" class="be-agent-chip be-agent-end">{{ labels?.[status] ?? statuses[status] }}</span></div>
    <p v-if="description" class="be-agent-muted">{{ description }}</p>
    <AgentDisclosure v-if="parameters.length || $slots.default" :open="open" @update:open="setOpen"><template #title>{{ labels?.parameters ?? 'Parameters' }}</template>
      <dl class="be-agent-body"><div v-for="parameter in parameters" :key="parameter.id"><dt>{{ parameter.label }}</dt><dd><slot name="parameter" :parameter="parameter">{{ parameter.value }}</slot></dd></div></dl><slot />
    </AgentDisclosure>
    <div v-if="status === 'pending'" class="be-agent-actions"><button type="button" class="be-agent-button be-agent-solid" @click="emit('approve')">{{ labels?.allowOnce ?? 'Allow once' }}</button><button v-if="onAlwaysAllow" type="button" class="be-agent-button" @click="onAlwaysAllow">{{ labels?.alwaysAllow ?? 'Always allow' }}</button><button type="button" class="be-agent-button" @click="emit('deny')">{{ labels?.deny ?? 'Deny' }}</button></div>
  </div>
</template>
<style scoped>.be-tool-approval{display:grid;gap:.75rem}.be-tool-approval p,.be-tool-approval dl,.be-tool-approval dd{margin:0}.be-tool-approval dl>div{display:grid;grid-template-columns:minmax(4rem,1fr) 3fr;gap:.5rem}.be-tool-approval dd{font-family:monospace;overflow-wrap:anywhere}</style>

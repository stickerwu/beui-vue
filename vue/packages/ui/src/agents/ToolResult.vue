<script setup lang="ts">
import AgentDisclosure from './AgentDisclosure.vue'
import { useCopy, type Labels } from './shared'
defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{
  tool: string, title: string, meta?: string, status?: 'running' | 'success' | 'error' | 'cancelled', kind?: 'terminal' | 'request' | 'custom',
  open?: boolean, defaultOpen?: boolean, collapseOnComplete?: boolean, maxHeight?: number, copyText?: string,
  onCopy?: () => void | Promise<void>, onRetry?: () => void, labels?: Labels, contentClassName?: string
}>(), { status: 'running', kind: 'terminal', open: undefined, defaultOpen: true, collapseOnComplete: true, maxHeight: 220 })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const { copied, copy } = useCopy()
const statusLabels = { running: 'Running', success: 'Completed', error: 'Failed', cancelled: 'Cancelled' }
</script>
<template>
  <AgentDisclosure v-bind="$attrs" :open="open" :default-open="defaultOpen" :active="status === 'running'" :collapse-on-complete="collapseOnComplete" :max-height="maxHeight" :content-class-name="contentClassName" @update:open="emit('update:open', $event); emit('openChange', $event)">
    <template #title><slot name="icon"><span aria-hidden="true">{{ kind === 'request' ? '{}' : '›_' }}</span></slot><span>{{ title }}</span><span class="be-agent-chip" role="status">{{ labels?.[status] ?? statusLabels[status] }}</span></template>
    <template #actions><button v-if="copyText || onCopy" type="button" class="be-agent-button" :aria-label="copied ? 'Copied' : (labels?.copy ?? 'Copy output')" @click="copy(copyText ?? '', onCopy)">{{ copied ? '✓' : '⧉' }}</button></template>
    <div class="be-agent-body"><div class="be-agent-muted">{{ tool }} <span v-if="meta">· {{ meta }}</span></div><slot /><button v-if="status === 'error' && onRetry" type="button" class="be-agent-button" @click="onRetry">{{ labels?.retry ?? 'Retry' }}</button></div>
  </AgentDisclosure>
</template>

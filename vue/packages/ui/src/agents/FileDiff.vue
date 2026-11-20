<script setup lang="ts">
import { computed } from 'vue'
import AgentDisclosure from './AgentDisclosure.vue'
import { useCopy, type Labels } from './shared'
export type FileDiffLine = { id: string, type?: 'added' | 'removed' | 'context', oldLine?: number, newLine?: number, content: string }
const props = withDefaults(defineProps<{ file: string, lines: FileDiffLine[], status?: 'streaming' | 'complete', open?: boolean, defaultOpen?: boolean, collapseOnComplete?: boolean, maxHeight?: number, language?: string, copyText?: string, onCopy?: () => void | Promise<void>, labels?: Labels }>(), { status: 'streaming', open: undefined, defaultOpen: true, collapseOnComplete: true, maxHeight: 220 })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const { copy, copied } = useCopy()
const counts = computed(() => ({ added: props.lines.filter(line => line.type === 'added').length, removed: props.lines.filter(line => line.type === 'removed').length }))
const sign = { added: '+', removed: '-', context: ' ' }
const text = computed(() => props.copyText ?? props.lines.map(line => sign[line.type ?? 'context'] + line.content).join('\n'))
</script>
<template>
  <AgentDisclosure :open="open" :default-open="defaultOpen" :active="status === 'streaming'" :collapse-on-complete="collapseOnComplete" :max-height="maxHeight" @update:open="emit('update:open', $event); emit('openChange', $event)">
    <template #title><strong>{{ file }}</strong><span class="be-agent-chip">+{{ counts.added }} −{{ counts.removed }}</span></template>
    <template #actions><button class="be-agent-button" type="button" :aria-label="copied ? (labels?.copied ?? 'Copied') : (labels?.copy ?? 'Copy diff')" @click="copy(text, onCopy)">{{ copied ? '✓' : '⧉' }}</button></template>
    <pre class="be-agent-code be-diff" :aria-label="labels?.changes ?? 'File changes'"><code><span v-for="line in lines" :key="line.id" :data-type="line.type"><small aria-hidden="true">{{ line.oldLine ?? ' ' }}  {{ line.newLine ?? ' ' }} </small>{{ sign[line.type ?? 'context'] }} {{ line.content }}{{ '\n' }}</span></code></pre>
  </AgentDisclosure>
</template>
<style scoped>.be-diff{padding:.5rem 0}.be-diff code>span{display:block;padding-inline:.8rem}.be-diff [data-type=added]{background:color-mix(in srgb,#22ac60 12%,transparent)}.be-diff [data-type=removed]{background:color-mix(in srgb,#dc464b 12%,transparent)}.be-diff small{color:var(--beui-muted-foreground);user-select:none}</style>

<script setup lang="ts">
import { computed, nextTick, shallowRef, watch } from 'vue'
import { useOpenState } from '../primitives/state'
import { sourceUrl, type Labels } from './shared'
import AgentDisclosure from './AgentDisclosure.vue'
export type ActivityItem =
  | { id: string, type: 'step', label: string, status?: 'pending' | 'active' | 'complete', meta?: string }
  | { id: string, type: 'text', content: string }
  | { id: string, type: 'search', query: string, results?: { id: string, title: string, domain?: string, url?: string }[], moreCount?: number }
  | { id: string, type: 'tool', action: string, target: string, additions?: number, deletions?: number }
  | { id: string, type: 'trace', kind: string, label: string, detail?: string }
const props = withDefaults(defineProps<{
  items: ActivityItem[], contentType?: ActivityItem['type'] | 'mixed', status?: 'working' | 'complete', duration?: number,
  open?: boolean, defaultOpen?: boolean, collapseOnComplete?: boolean, activeLabel?: string, summary?: string, maxHeight?: number, labels?: Labels, contentClassName?: string
}>(), { status: 'working', duration: 0, open: undefined, defaultOpen: false, collapseOnComplete: true, maxHeight: 208 })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
const list = shallowRef<HTMLOListElement | null>(null)
const kind = computed(() => props.contentType ?? (new Set(props.items.map(item => item.type)).size > 1 ? 'mixed' : props.items[0]?.type ?? 'step'))
const activeMessages = { step: 'Thinking…', text: 'Thinking…', search: 'Searching the web…', tool: 'Running tools…', trace: 'Working through the run…', mixed: 'Working through it…' }
const summary = computed(() => {
  if (props.summary) return props.summary
  if (kind.value === 'search') return props.labels?.searched ?? 'Searched the web'
  if (kind.value === 'tool') return `Ran ${props.items.length} tool${props.items.length === 1 ? '' : 's'}`
  if (kind.value === 'step' && !props.duration) return `Completed ${props.items.filter(item => item.type === 'step' && item.status === 'complete').length} steps`
  return `Thought for ${Math.round(props.duration)}s`
})
watch(() => props.status, (next, previous) => {
  if (previous === 'working' && next === 'complete') setOpen(!props.collapseOnComplete)
})
watch(() => props.items, async () => {
  if (props.status !== 'working') return
  await nextTick()
  const parent = list.value?.parentElement
  if (parent) parent.scrollTop = parent.scrollHeight
}, { deep: true })
</script>
<template>
  <AgentDisclosure :open="status === 'working' || open" :max-height="maxHeight" :content-class-name="contentClassName" @update:open="status === 'complete' && setOpen($event)">
    <template #title><span role="status"><slot v-if="status === 'working'" name="working-status" :duration="duration">{{ activeLabel ?? activeMessages[kind] }}</slot><slot v-else name="completed-status" :duration="duration" :summary="summary">{{ summary }}</slot></span></template>
    <ol ref="list" class="be-activity-list"><li v-for="item in items" :key="item.id" :data-type="item.type"><slot name="item" :item="item">
      <template v-if="item.type === 'step'"><span aria-hidden="true">{{ item.status === 'complete' ? '✓' : item.status === 'active' ? '◐' : '○' }}</span> {{ item.label }} <small>{{ item.meta }}</small></template>
      <template v-else-if="item.type === 'text'">{{ item.content }}</template>
      <template v-else-if="item.type === 'search'"><strong>{{ item.query }}</strong><ul><li v-for="result in item.results" :key="result.id"><component :is="sourceUrl(result.url) ? 'a' : 'span'" :href="sourceUrl(result.url)" target="_blank" rel="noopener noreferrer">{{ result.title }}</component> <small>{{ result.domain }}</small></li></ul><small v-if="item.moreCount">+{{ item.moreCount }} more</small></template>
      <template v-else-if="item.type === 'tool'">{{ item.action }} <code>{{ item.target }}</code> <small v-if="item.additions">+{{ item.additions }}</small> <small v-if="item.deletions">−{{ item.deletions }}</small></template>
      <template v-else><span class="be-agent-chip">{{ item.kind }}</span> {{ item.label }} <small>{{ item.detail }}</small></template>
    </slot></li></ol>
  </AgentDisclosure>
</template>
<style scoped>.be-activity-list{margin:0;padding:.25rem 1rem .75rem;list-style:none}.be-activity-list>li{padding:.35rem 0 .35rem .75rem;border-inline-start:1px solid var(--beui-border)}.be-activity-list small{color:var(--beui-muted-foreground)}.be-activity-list ul{padding-inline-start:1.2rem}.be-activity-list ul a{text-decoration:underline}</style>

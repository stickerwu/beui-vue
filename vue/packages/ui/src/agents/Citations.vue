<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, useId } from 'vue'
import AgentDisclosure from './AgentDisclosure.vue'
import { useOpenState } from '../primitives/state'
import { sourceUrl, type CitationItem, type Labels } from './shared'
const props = withDefaults(defineProps<{ citations: CitationItem[], title?: string, open?: boolean, defaultOpen?: boolean, idPrefix?: string, labels?: Labels }>(), { open: undefined, defaultOpen: false })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
const id = useId()
async function jump(event: Event) {
  const target = (event as CustomEvent<string>).detail
  if (!props.citations.some(item => `${props.idPrefix ?? id}-${item.id}` === target)) return
  setOpen(true)
  await nextTick()
  document.getElementById(target)?.focus()
}
onMounted(() => document.addEventListener('beui:citation', jump))
onBeforeUnmount(() => document.removeEventListener('beui:citation', jump))
</script>
<template>
  <AgentDisclosure :open="open" @update:open="setOpen"><template #title><span class="be-source-stack" aria-hidden="true"><i v-for="item in citations.slice(0,3)" :key="item.id">{{ (item.domain ?? item.title).slice(0,1).toUpperCase() }}</i></span>{{ title ?? labels?.title ?? 'Sources' }} <span class="be-agent-muted">{{ citations.length }}</span></template>
    <ol class="be-source-list"><li v-for="(item,index) in citations" :id="`${idPrefix ?? id}-${item.id}`" :key="item.id" tabindex="-1"><span class="be-source-index">{{ index + 1 }}</span><component :is="sourceUrl(item.url) ? 'a' : 'span'" :href="sourceUrl(item.url)" :target="sourceUrl(item.url) ? '_blank' : undefined" rel="noopener noreferrer"><slot name="source" :item="item">{{ item.title }}<small v-if="item.domain">{{ item.domain }}</small></slot></component></li></ol>
  </AgentDisclosure>
</template>
<style scoped>.be-source-list{list-style:none;margin:0;padding:.25rem .75rem .75rem}.be-source-list li{display:flex;align-items:center;gap:.65rem;padding:.4rem;border-radius:.5rem}.be-source-list li:focus{outline:2px solid var(--beui-ring)}.be-source-list small{display:block;color:var(--beui-muted-foreground)}.be-source-index,.be-source-stack i{display:inline-grid;place-items:center;min-width:1.35rem;height:1.35rem;background:var(--beui-muted);border-radius:50%;font-size:.7rem;font-style:normal}.be-source-stack{display:flex}.be-source-stack i+i{margin-left:-.3rem;border:1px solid var(--beui-background)}</style>

<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, useId } from 'vue'
import { swapSpring } from '../core/motion'
import { useOpenState } from '../primitives/state'
import AgentIcon from './AgentIcon.vue'
import AgentReveal from './AgentReveal.vue'
import CitationList from './CitationList.vue'
import { citationTargetId, type CitationItem, type Labels } from './shared'

const props = withDefaults(defineProps<{ citations: CitationItem[], title?: string, open?: boolean, defaultOpen?: boolean, idPrefix?: string, labels?: Labels }>(), { open: undefined, defaultOpen: false })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
const reduce = useReducedMotion()
const baseId = useId()
const contentId = `${baseId}-content`
const prefix = computed(() => props.idPrefix ?? `citation-${baseId}`)

async function jump(event: Event) {
  const target = (event as CustomEvent<string>).detail
  if (!props.citations.some(item => citationTargetId(prefix.value, item.id) === target)) return
  event.preventDefault()
  setOpen(true)
  await nextTick()
  const row = document.getElementById(target)
  row?.focus({ preventScroll: true })
  row?.scrollIntoView({ block: 'nearest' })
}
onMounted(() => document.addEventListener('beui:citation', jump))
onBeforeUnmount(() => document.removeEventListener('beui:citation', jump))
</script>

<template>
  <div class="cs-root">
    <button type="button" class="cs-trigger" :aria-expanded="open" :aria-controls="contentId" @click="setOpen(!open)">
      <AgentIcon name="BookOpenText" :size="16" />
      <span class="cs-title">{{ title ?? labels?.title ?? 'Sources' }}</span>
      <span class="cs-count">{{ citations.length }}</span>
      <motion.span aria-hidden="true" class="cs-chevron" :initial="false" :animate="{ rotate: open ? 180 : 0 }" :transition="reduce ? { duration: 0 } : swapSpring"><AgentIcon name="ChevronDown" :size="14" /></motion.span>
    </button>
    <AgentReveal :id="contentId" :open="open">
      <CitationList :citations="citations" :id-prefix="prefix" class="cs-list"><template v-if="$slots.source" #source="scope"><slot name="source" v-bind="scope" /></template></CitationList>
    </AgentReveal>
  </div>
</template>

<style scoped>
.cs-root { width: 100%; font-size: .875rem; line-height: 1.25rem; }
.cs-trigger { display: flex; min-height: 2rem; align-items: center; gap: .5rem; margin-left: -.25rem; padding: 0 .25rem; border: 0; border-radius: .5rem; background: none; font: inherit; text-align: left; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color .15s; }
.cs-trigger:hover { color: var(--beui-foreground); }
.cs-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.cs-title { font-weight: 500; }
.cs-count { border-radius: 9999px; background: var(--beui-muted); padding: .125rem .375rem; font-size: 10px; line-height: calc(1.25 / .875); font-weight: 600; font-variant-numeric: tabular-nums; }
.cs-chevron { display: inline-flex; color: color-mix(in oklab, var(--beui-muted-foreground) 60%, transparent); }
.cs-list { margin-top: .25rem; }
</style>

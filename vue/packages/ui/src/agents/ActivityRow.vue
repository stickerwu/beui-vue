<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed } from 'vue'
import { easeOut, layoutSpring } from '../core/motion'
import AgentIcon from './AgentIcon.vue'
import { sourceUrl } from './shared'
import type { ActivityItem, AgentActivityTranslate, AgentSearchResult } from './activity-types'

const props = defineProps<{ item: ActivityItem, t: AgentActivityTranslate }>()
const reduce = useReducedMotion()
const enter = computed(() => reduce.value ? { opacity: 1 } : { opacity: 0, y: 6 })
const visible = { opacity: 1, y: 0 }
const exit = computed(() => reduce.value ? { opacity: 0 } : { opacity: 0, y: -3 })
const transition = computed(() => reduce.value ? { duration: 0 } : { opacity: { duration: 0.18, ease: easeOut }, y: layoutSpring, layout: layoutSpring })
const KNOWN = ['read', 'edit', 'write', 'run'] as const
const toolLabel = computed(() => {
  if (props.item.type !== 'tool') return ''
  const action = props.item.action
  const known = KNOWN.find(name => name === action)
  return known ? props.t(known) : action.charAt(0).toUpperCase() + action.slice(1)
})
const toolIcon = computed(() => {
  const action = props.item.type === 'tool' ? props.item.action : ''
  if (action === 'read') return 'FileText' as const
  if (action === 'edit' || action === 'write') return 'PencilLine' as const
  if (action === 'run') return 'SquareTerminal' as const
  return 'Wrench' as const
})
const traceIcon = computed(() => {
  const kind = props.item.type === 'trace' ? props.item.kind : ''
  if (kind === 'thinking') return 'Sparkles' as const
  if (kind === 'message') return 'MessageSquare' as const
  if (kind === 'write') return 'PencilLine' as const
  if (kind === 'run') return 'SquareTerminal' as const
  if (kind === 'read') return 'ImageIcon' as const
  return 'Wrench' as const
})
const resultUrl = (result: AgentSearchResult) => sourceUrl(result.url)
</script>

<template>
  <div v-if="item.type === 'step'" class="ar-step">
    <span class="ar-glyph" aria-hidden="true">
      <AgentIcon v-if="(item.status ?? 'complete') === 'complete'" name="Check" :size="16" :stroke-width="1.8" />
      <span v-else-if="item.status === 'active'" class="ar-dot">
        <motion.span class="ar-dot-halo" :animate="{ opacity: [0.35, 0.8, 0.35] }" :transition="{ duration: 1.5, repeat: Infinity }" />
        <span class="ar-dot-core" />
      </span>
      <AgentIcon v-else name="Circle" :size="12" :stroke-width="1.5" />
    </span>
    <span class="ar-step-label" :data-pending="item.status === 'pending' || undefined">{{ item.label }}</span>
    <span v-if="item.meta" class="ar-meta">{{ item.meta }}</span>
  </div>

  <div v-else-if="item.type === 'text'" class="ar-text">{{ item.content }}</div>

  <div v-else-if="item.type === 'search'" class="ar-search">
    <div class="ar-query">
      <AgentIcon name="Search" :size="16" :stroke-width="1.7" /><span class="ar-truncate">{{ item.query }}</span>
    </div>
    <div v-if="item.results?.length" class="ar-results">
      <AnimatePresence mode="popLayout" :initial="true">
        <motion.div v-for="result in item.results" :key="result.id" layout="position" :initial="enter" :animate="visible" :exit="exit" :transition="transition">
          <component :is="resultUrl(result) ? 'a' : 'div'" class="ar-result" :href="resultUrl(result)">
            <span class="ar-result-icon" aria-hidden="true"><slot name="result-icon" :result="result"><AgentIcon name="Globe2" :size="12" /></slot></span>
            <span class="ar-result-title ar-truncate">{{ result.title }}</span>
            <span v-if="result.domain" class="ar-result-domain ar-truncate">{{ result.domain }}</span>
          </component>
        </motion.div>
      </AnimatePresence>
    </div>
    <AnimatePresence :initial="true">
      <motion.div v-if="item.moreCount" key="more-results" :initial="enter" :animate="visible" :exit="exit" :transition="transition" class="ar-more">{{ t('moreResults', { count: item.moreCount }) }}</motion.div>
    </AnimatePresence>
  </div>

  <div v-else-if="item.type === 'tool'" class="ar-tool">
    <span class="ar-glyph" aria-hidden="true"><AgentIcon :name="toolIcon" :size="16" /></span>
    <span class="ar-strong">{{ toolLabel }}</span>
    <span class="ar-code ar-truncate" style="flex:1">{{ item.target }}</span>
    <span v-if="typeof item.additions === 'number' || typeof item.deletions === 'number'" class="ar-diff">
      <span v-if="typeof item.additions === 'number'" class="ar-add">+{{ item.additions }}</span>
      <span v-if="typeof item.deletions === 'number'" class="ar-del">−{{ item.deletions }}</span>
    </span>
  </div>

  <div v-else class="ar-trace">
    <span class="ar-glyph" aria-hidden="true"><slot name="trace-icon" :item="item"><AgentIcon :name="traceIcon" :size="16" /></slot></span>
    <span class="ar-strong">{{ item.label }}</span>
    <span v-if="item.detail" class="ar-code ar-truncate">{{ item.detail }}</span><span v-else />
  </div>
</template>

<style scoped>
.ar-step, .ar-tool, .ar-trace, .ar-query, .ar-result { box-sizing: border-box; border-radius: .375rem; padding-inline: .375rem; }
.ar-step { display: flex; min-height: 1.75rem; align-items: flex-start; gap: .625rem; padding-block: .25rem; }
.ar-glyph { display: grid; width: 1rem; height: 1rem; flex: none; place-items: center; color: color-mix(in oklab, var(--beui-muted-foreground) 70%, transparent); }
.ar-step .ar-glyph { margin-top: .125rem; }
.ar-dot { position: relative; display: grid; width: .75rem; height: .75rem; place-items: center; }
.ar-dot-halo { position: absolute; inset: 0; border-radius: 9999px; background: color-mix(in oklab, var(--beui-foreground) 10%, transparent); }
.ar-dot-core { width: .375rem; height: .375rem; border-radius: 9999px; background: color-mix(in oklab, var(--beui-foreground) 60%, transparent); }
.ar-step-label { min-width: 0; flex: 1; line-height: 1.25rem; color: color-mix(in oklab, var(--beui-foreground) 90%, transparent); }
.ar-step-label[data-pending] { color: color-mix(in oklab, var(--beui-muted-foreground) 55%, transparent); }
.ar-meta { flex: none; line-height: 1.25rem; color: color-mix(in oklab, var(--beui-muted-foreground) 55%, transparent); }
.ar-text { border-radius: .375rem; padding: .25rem .375rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.ar-search { display: grid; gap: .125rem; }
.ar-query { display: flex; min-height: 1.75rem; align-items: center; gap: .625rem; padding-block: .25rem; color: var(--beui-muted-foreground); }
.ar-query :deep(svg) { flex: none; }
.ar-results { display: grid; gap: .125rem; padding-left: 1rem; }
.ar-result { display: flex; min-height: 1.75rem; align-items: center; gap: .5rem; padding-block: .25rem; text-align: left; text-decoration: none; color: inherit; outline: none; transition: color .15s, background-color .15s; }
a.ar-result:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.ar-result-icon { display: grid; width: 1.25rem; height: 1.25rem; flex: none; place-items: center; color: var(--beui-muted-foreground); }
.ar-result-title { min-width: 0; font-weight: 500; color: color-mix(in oklab, var(--beui-foreground) 90%, transparent); }
.ar-result-domain { min-width: 0; color: color-mix(in oklab, var(--beui-muted-foreground) 55%, transparent); }
.ar-more { padding: .25rem .375rem .25rem 2rem; color: color-mix(in oklab, var(--beui-muted-foreground) 55%, transparent); }
.ar-tool { display: flex; min-height: 2rem; min-width: 0; align-items: center; gap: .625rem; padding-block: .125rem; line-height: 1.25rem; }
.ar-trace { display: grid; min-height: 2rem; grid-template-columns: 1rem auto minmax(0, 1fr); align-items: center; gap: .625rem; padding-block: .125rem; }
.ar-strong { flex: none; font-weight: 500; color: color-mix(in oklab, var(--beui-foreground) 90%, transparent); }
.ar-code { min-width: 0; border-radius: .5rem; background: color-mix(in oklab, var(--beui-muted) 80%, transparent); padding: .25rem .625rem; font-family: var(--font-mono, ui-monospace, monospace); font-size: .75rem; line-height: 1rem; color: color-mix(in oklab, var(--beui-muted-foreground) 70%, transparent); }
.ar-diff { display: flex; flex: none; align-items: center; gap: .5rem; font-family: var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.ar-add { color: oklch(69.6% .17 162.48); }
.ar-del { color: oklch(64.5% .246 16.439); }
.ar-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>

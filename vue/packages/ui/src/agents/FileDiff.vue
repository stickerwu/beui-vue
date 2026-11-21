<script lang="ts">
export const fileDiffMessages = { applying: 'Applying changes', applied: 'Changes applied', changes: 'File changes', copy: 'Copy diff', copied: 'Copied' }
export type FileDiffLine = { id: string, type?: 'added' | 'removed' | 'context', oldLine?: number, newLine?: number, content: string }
</script>
<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, useId, useTemplateRef, watch } from 'vue'
import { pressSpring, swapSpring } from '../core/motion'
import { useOpenState } from '../primitives/state'
import AgentCodeLine from './AgentCodeLine.vue'
import AgentIcon from './AgentIcon.vue'
import AgentReveal from './AgentReveal.vue'
import './agent-tokens.css'
import { useCopy, type Labels } from './shared'

const props = withDefaults(defineProps<{
  file: string, lines: FileDiffLine[], status?: 'streaming' | 'complete', open?: boolean, defaultOpen?: boolean, collapseOnComplete?: boolean,
  maxHeight?: number, language?: string, copyText?: string, onCopy?: () => void | Promise<void>, labels?: Labels
}>(), { status: 'streaming', open: undefined, defaultOpen: true, collapseOnComplete: true, maxHeight: 220, language: 'typescript' })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const reduce = useReducedMotion()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
const { copied, copy } = useCopy()
const uid = useId()
const viewport = useTemplateRef<HTMLElement>('viewport')
const streaming = computed(() => props.status === 'streaming')
const additions = computed(() => props.lines.filter(line => line.type === 'added').length)
const deletions = computed(() => props.lines.filter(line => line.type === 'removed').length)
const canCopy = computed(() => Boolean(props.copyText || props.onCopy))
const t = (key: keyof typeof fileDiffMessages) => props.labels?.[key] ?? fileDiffMessages[key]
const format = (value: number) => new Intl.NumberFormat('en').format(value)

watch(() => props.status, (next, previous) => {
  if (previous !== 'streaming' && next === 'streaming') setOpen(true)
  if (previous === 'streaming' && next === 'complete' && props.collapseOnComplete) setOpen(false)
})

let frame = 0
watch(() => [props.lines, props.lines.length, props.status, open.value] as const, () => {
  cancelAnimationFrame(frame)
  if (!open.value || !streaming.value) return
  frame = requestAnimationFrame(() => {
    const el = viewport.value
    if (!el || el.scrollHeight <= el.clientHeight) return
    el.scrollTo({ top: el.scrollHeight, behavior: reduce.value ? 'auto' : 'smooth' })
  })
}, { flush: 'post' })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>
<template>
  <div class="be-ag be-fd" :data-state="status" :aria-busy="streaming">
    <button :id="`${uid}-trigger`" type="button" class="be-fd-trigger" :aria-expanded="open" :aria-controls="`${uid}-content`" @click="setOpen(!open)">
      <AgentIcon name="FileCode2" :size="16" class="be-fd-file" />
      <span class="be-fd-name"><slot name="file">{{ file }}</slot></span>
      <span class="be-fd-counts">
        <span v-if="additions" class="be-fd-count" data-type="added">+{{ format(additions) }}</span>
        <span v-if="deletions" class="be-fd-count" data-type="removed">−{{ format(deletions) }}</span>
      </span>
      <span class="be-fd-state"><span v-if="streaming" role="img" :aria-label="t('applying')" class="be-fd-icon"><AgentIcon name="LoaderCircle" :size="14" :class="{ 'be-ag-spin': !reduce }" /></span><span v-else role="img" :aria-label="t('applied')" class="be-fd-icon"><AgentIcon name="Check" :size="14" /></span></span>
      <motion.span aria-hidden="true" class="be-fd-chevron" :animate="{ rotate: open ? 180 : 0 }" :transition="reduce ? { duration: 0 } : swapSpring"><AgentIcon name="ChevronDown" :size="14" /></motion.span>
    </button>
    <AgentReveal :id="`${uid}-content`" role="region" :aria-labelledby="`${uid}-trigger`" :open="open">
      <div class="be-fd-indent">
        <div class="be-fd-card">
          <div ref="viewport" data-slot="file-diff-viewport" aria-live="polite" class="be-fd-viewport be-ag-hide-scroll" :style="{ maxHeight: `${maxHeight}px` }">
            <div class="be-fd-lines">
              <span class="be-ag-sr">{{ t('changes') }}</span>
              <div v-for="line in lines" :key="line.id" class="be-fd-line" :data-type="line.type ?? 'context'">
                <span class="be-fd-num">{{ line.oldLine }}</span>
                <span class="be-fd-num">{{ line.newLine }}</span>
                <span class="be-fd-sign">{{ line.type === 'added' ? '+' : line.type === 'removed' ? '−' : '' }}</span>
                <AgentCodeLine :code="line.content" :language="language" class="be-fd-code" />
              </div>
            </div>
          </div>
          <div v-if="canCopy" class="be-fd-foot"><motion.button type="button" class="be-fd-copy" :aria-label="copied ? t('copied') : t('copy')" :title="copied ? t('copied') : t('copy')" :while-press="reduce ? undefined : { scale: 0.9 }" :transition="pressSpring" @click="copy(copyText ?? '', onCopy)"><AgentIcon :name="copied ? 'Check' : 'Copy'" :size="14" /></motion.button></div>
        </div>
      </div>
    </AgentReveal>
  </div>
</template>
<style scoped>
.be-fd { box-sizing: border-box; width: 100%; font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.be-fd-trigger { display: flex; box-sizing: border-box; min-height: 2.25rem; width: 100%; align-items: center; gap: 0.5rem; padding: 0.25rem 0; border: 0; border-radius: 0.375rem; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; outline: none; }
.be-fd-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-fd-file { color: var(--beui-muted-foreground); }
.be-fd-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.75rem; line-height: 1rem; color: color-mix(in srgb, var(--beui-foreground) 80%, transparent); }
.be-fd-counts { display: flex; flex: none; align-items: center; gap: 0.5rem; }
.be-fd-count { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.75rem; line-height: 1rem; font-variant-numeric: tabular-nums; }
.be-fd-count[data-type=added] { color: var(--ag-green); }
.be-fd-count[data-type=removed] { color: var(--ag-rose); }
.be-fd-state { display: grid; flex: none; width: 1rem; height: 1rem; place-items: center; color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); }
.be-fd-icon { display: grid; place-items: center; }
.be-fd-chevron { display: inline-flex; flex: none; color: color-mix(in srgb, var(--beui-muted-foreground) 45%, transparent); transition: color 0.15s; }
.be-fd-trigger:hover .be-fd-chevron { color: var(--beui-muted-foreground); }
.be-fd-indent { padding: 0.375rem 0 0 1.5rem; }
.be-fd-card { overflow: hidden; border-radius: 0.75rem; background: color-mix(in srgb, var(--beui-muted) 80%, transparent); }
.be-fd-viewport { overflow: auto; }
.be-fd-lines { font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.75rem; line-height: 1.25rem; }
.be-fd-line { display: grid; grid-template-columns: 2.25rem 2.25rem 1rem minmax(0, 1fr); }
.be-fd-line[data-type=added] { background: oklch(69.6% 0.17 162.48 / 0.07); }
.be-fd-line[data-type=removed] { background: oklch(64.5% 0.246 16.439 / 0.07); }
.be-fd-num { user-select: none; padding-right: 0.5rem; text-align: right; font-variant-numeric: tabular-nums; color: color-mix(in srgb, var(--beui-muted-foreground) 40%, transparent); }
.be-fd-sign { user-select: none; text-align: center; color: color-mix(in srgb, var(--beui-muted-foreground) 45%, transparent); }
.be-fd-line[data-type=added] .be-fd-sign { color: var(--ag-green); }
.be-fd-line[data-type=removed] .be-fd-sign { color: var(--ag-rose); }
.be-fd-code { min-width: 0; white-space: pre; padding-inline: 0.375rem; }
.be-fd-foot { display: flex; justify-content: flex-end; padding: 0.25rem 0.5rem 0.375rem; }
.be-fd-copy { display: grid; width: 1.75rem; height: 1.75rem; place-items: center; padding: 0; border: 0; border-radius: 0.375rem; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color 0.15s, background-color 0.15s; }
.be-fd-copy:hover { background: color-mix(in srgb, var(--beui-background) 70%, transparent); color: var(--beui-foreground); }
.be-fd-copy:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
</style>

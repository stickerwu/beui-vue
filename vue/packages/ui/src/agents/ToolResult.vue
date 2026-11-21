<script lang="ts">
export const toolResultMessages = { running: 'Running', success: 'Completed', error: 'Failed', cancelled: 'Cancelled', copy: 'Copy result', copied: 'Copied', retry: 'Run again' }
export type ToolResultStatus = 'running' | 'success' | 'error' | 'cancelled'
export type ToolResultKind = 'terminal' | 'request' | 'custom'
</script>
<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, useId, useTemplateRef, watch } from 'vue'
import { pressSpring, swapSpring } from '../core/motion'
import { useOpenState } from '../primitives/state'
import AgentIcon from './AgentIcon.vue'
import AgentReveal from './AgentReveal.vue'
import AgentRollText from './AgentRollText.vue'
import './agent-tokens.css'
import { useCopy, type Labels } from './shared'

const props = withDefaults(defineProps<{
  tool: string, title: string, meta?: string, status?: ToolResultStatus, kind?: ToolResultKind,
  open?: boolean, defaultOpen?: boolean, collapseOnComplete?: boolean, maxHeight?: number, copyText?: string,
  onCopy?: () => void | Promise<void>, onRetry?: () => void, labels?: Labels, contentClassName?: string
}>(), { status: 'running', kind: 'custom', open: undefined, defaultOpen: true, collapseOnComplete: true, maxHeight: 220 })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const reduce = useReducedMotion()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
const { copied, copy } = useCopy()
const uid = useId()
const viewport = useTemplateRef<HTMLElement>('viewport')
const running = computed(() => props.status === 'running')
const canCopy = computed(() => Boolean(props.copyText || props.onCopy))
const t = (key: keyof typeof toolResultMessages) => props.labels?.[key] ?? toolResultMessages[key]
const statusLabel = computed(() => t(props.status))
const kindIcon = computed(() => props.kind === 'terminal' ? 'SquareTerminal' : props.kind === 'request' ? 'Braces' : 'Wrench')
const statusIcon = computed(() => ({ running: 'LoaderCircle', success: 'CircleCheck', error: 'CircleX', cancelled: 'Ban' } as const)[props.status])

watch(() => props.status, (next, previous) => {
  if (previous !== 'running' && next === 'running') setOpen(true)
  if (previous === 'running' && next !== 'running' && props.collapseOnComplete) setOpen(false)
})

let frame = 0
watch(() => [props.status, open.value] as const, scrollDown, { flush: 'post' })
// The slot content is opaque, so follow every update while the tool is running.
function scrollDown() {
  cancelAnimationFrame(frame)
  if (!open.value || !running.value) return
  frame = requestAnimationFrame(() => viewport.value?.scrollTo({ top: viewport.value.scrollHeight, behavior: reduce.value ? 'auto' : 'smooth' }))
}
let observer: MutationObserver | undefined
watch(viewport, element => {
  observer?.disconnect()
  if (!element || typeof MutationObserver === 'undefined') return
  observer = new MutationObserver(scrollDown)
  observer.observe(element, { childList: true, subtree: true, characterData: true })
}, { flush: 'post' })
onBeforeUnmount(() => { cancelAnimationFrame(frame); observer?.disconnect() })
</script>
<template>
  <div class="be-ag be-tr" :data-state="status" :aria-busy="running">
    <button :id="`${uid}-trigger`" type="button" class="be-tr-trigger" :aria-expanded="open" :aria-controls="`${uid}-content`" @click="setOpen(!open)">
      <span aria-hidden="true" class="be-tr-icon"><slot name="icon"><AgentIcon :name="kindIcon" :size="16" /></slot></span>
      <span class="be-tr-text">
        <span class="be-tr-title"><AgentRollText :value="title">{{ title }}</AgentRollText></span>
        <span v-if="meta" class="be-tr-meta"><AgentRollText :value="meta">{{ meta }}</AgentRollText></span>
        <span class="be-tr-tool"><AgentRollText :value="tool">{{ tool }}</AgentRollText></span>
      </span>
      <span class="be-tr-status" :data-status="status"><AgentIcon :name="statusIcon" :size="12" :class="{ 'be-ag-spin': running && !reduce }" /><AgentRollText :value="status">{{ statusLabel }}</AgentRollText></span>
      <motion.span aria-hidden="true" class="be-tr-chevron" :animate="{ rotate: open ? 180 : 0 }" :transition="reduce ? { duration: 0 } : swapSpring"><AgentIcon name="ChevronDown" :size="14" /></motion.span>
    </button>
    <AgentReveal :id="`${uid}-content`" role="region" :aria-labelledby="`${uid}-trigger`" :open="open">
      <div class="be-tr-indent">
        <div class="be-tr-card">
          <div ref="viewport" role="log" aria-live="polite" class="be-tr-viewport be-ag-hide-scroll" :style="{ maxHeight: `${maxHeight}px` }"><div class="be-tr-content" :class="contentClassName"><slot /></div></div>
          <div v-if="canCopy || onRetry" class="be-tr-foot">
            <motion.button v-if="canCopy" type="button" class="be-tr-action" :aria-label="copied ? t('copied') : t('copy')" :title="copied ? t('copied') : t('copy')" :while-press="reduce ? undefined : { scale: 0.9 }" :transition="pressSpring" @click="copy(copyText ?? '', onCopy)"><AgentIcon :name="copied ? 'Check' : 'Copy'" :size="14" /></motion.button>
            <motion.button v-if="onRetry" type="button" class="be-tr-action" :aria-label="t('retry')" :title="t('retry')" :while-press="reduce ? undefined : { scale: 0.9 }" :transition="pressSpring" @click="onRetry"><AgentIcon name="RotateCcw" :size="14" /></motion.button>
            <span class="be-tr-foot-status"><AgentRollText :value="status">{{ statusLabel }}</AgentRollText></span>
          </div>
        </div>
      </div>
    </AgentReveal>
  </div>
</template>
<style scoped>
.be-tr { box-sizing: border-box; width: 100%; font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.be-tr-trigger { display: flex; box-sizing: border-box; min-height: 2.25rem; width: 100%; align-items: center; gap: 0.5rem; padding: 0.25rem 0; border: 0; border-radius: 0.375rem; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; outline: none; }
.be-tr-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-tr-icon { display: grid; flex: none; width: 1rem; height: 1rem; place-items: center; color: var(--beui-muted-foreground); }
.be-tr-text { display: flex; min-width: 0; flex: 1; align-items: baseline; gap: 0.5rem; }
.be-tr-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; color: color-mix(in srgb, var(--beui-foreground) 90%, transparent); }
.be-tr-meta { flex: none; font-size: 0.75rem; line-height: 1rem; color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); }
.be-tr-tool { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono, ui-monospace, monospace); font-size: 11px; line-height: 1rem; color: color-mix(in srgb, var(--beui-muted-foreground) 55%, transparent); }
.be-tr-status { display: inline-flex; flex: none; align-items: center; gap: 0.25rem; font-size: 11px; line-height: 1rem; font-weight: 500; color: var(--beui-muted-foreground); }
.be-tr-status[data-status=running] { color: var(--ag-blue); }
.be-tr-status[data-status=success] { color: var(--ag-green); }
.be-tr-status[data-status=error] { color: var(--ag-rose); }
.be-tr-chevron { display: inline-flex; flex: none; color: color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent); transition: color 0.15s; }
.be-tr-trigger:hover .be-tr-chevron { color: var(--beui-muted-foreground); }
.be-tr-indent { padding: 0.375rem 0 0 1.5rem; }
.be-tr-card { overflow: hidden; border-radius: 0.75rem; background: color-mix(in srgb, var(--beui-muted) 80%, transparent); }
.be-tr-viewport { overflow-y: auto; }
.be-tr-content { padding: 0.75rem; }
.be-tr-foot { display: flex; align-items: center; gap: 0.125rem; padding: 0 0.5rem 0.375rem; }
.be-tr-action { display: grid; width: 1.75rem; height: 1.75rem; place-items: center; padding: 0; border: 0; border-radius: 0.375rem; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color 0.15s, background-color 0.15s; }
.be-tr-action:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.be-tr-action:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-tr-foot-status { margin-inline-start: auto; font-size: 11px; line-height: 1rem; color: color-mix(in srgb, var(--beui-muted-foreground) 55%, transparent); }
</style>

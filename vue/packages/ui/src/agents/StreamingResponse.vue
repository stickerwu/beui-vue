<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, useId } from 'vue'
import { easeOut, pressSpring, swapSpring } from '../core/motion'
import AgentIcon from './AgentIcon.vue'
import AgentReveal from './AgentReveal.vue'
import CitationList from './CitationList.vue'
import CitationStack from './CitationStack.vue'
import { useHasListener, useValue, type CitationItem, type Labels } from './shared'

type Feedback = 'up' | 'down' | null
const props = withDefaults(defineProps<{
  status?: 'streaming' | 'complete' | 'error', copyText?: string, onCopy?: () => void | Promise<void>,
  sources?: CitationItem[], sourcesOpen?: boolean, defaultSourcesOpen?: boolean, sourceIdPrefix?: string,
  feedback?: Feedback, defaultFeedback?: Feedback, announce?: boolean, showActions?: boolean, labels?: Labels, contentClassName?: string, actionsClassName?: string
}>(), { status: 'streaming', sources: () => [], sourcesOpen: undefined, defaultSourcesOpen: false, defaultFeedback: null, announce: true, showActions: true })
const emit = defineEmits<{ 'update:feedback': [value: Feedback], feedbackChange: [value: Feedback], 'update:sourcesOpen': [value: boolean], sourcesOpenChange: [value: boolean], retry: [] }>()
defineSlots<{ default?(): unknown }>()
// The retry action only shows when a listener is bound, like upstream's optional `onRetry`.
const hasRetry = useHasListener('retry')
const reduce = useReducedMotion()
const baseId = useId()
const { value: vote, set: setVote } = useValue(() => props.feedback, props.defaultFeedback, next => { emit('update:feedback', next); emit('feedbackChange', next) })
const { value: sourcesOpen, set: setSourcesOpen } = useValue(() => props.sourcesOpen, props.defaultSourcesOpen, next => { emit('update:sourcesOpen', next); emit('sourcesOpenChange', next) })
const copied = shallowRef(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

const streaming = computed(() => props.status === 'streaming')
const complete = computed(() => props.status === 'complete')
const canCopy = computed(() => Boolean(props.copyText || props.onCopy))
const hasSources = computed(() => props.sources.length > 0)
const showActions = computed(() => props.showActions && !streaming.value && (canCopy.value || hasRetry() || complete.value || hasSources.value))
const sourcesContentId = `${baseId}-sources`
const sourcePrefix = computed(() => props.sourceIdPrefix ?? `response-source-${baseId}`)
const t = (key: string, fallback: string, values?: Record<string, string | number>) => (props.labels?.[key] ?? fallback).replace(/\{(\w+)\}/g, (match, name) => values?.[name] === undefined ? match : String(values[name]))

async function copy() {
  if (props.onCopy) await props.onCopy()
  else if (props.copyText) await navigator.clipboard?.writeText(props.copyText)
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copied.value = false }, 1600)
}
function toggleVote(next: 'up' | 'down') { setVote(vote.value === next ? null : next) }
onBeforeUnmount(() => clearTimeout(copyTimer))
</script>

<template>
  <div class="sr" :data-state="status" :aria-busy="streaming">
    <div class="sr-content" :class="contentClassName" :aria-live="announce ? 'polite' : 'off'"><slot /></div>

    <AnimatePresence :initial="false">
      <motion.div v-if="showActions" key="actions" class="sr-footer" :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 4 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }" :transition="{ duration: reduce ? 0.12 : 0.22, ease: easeOut }">
        <div class="sr-actions" :class="actionsClassName">
          <motion.button v-if="canCopy" type="button" class="sr-action" :aria-label="copied ? (labels?.copied ?? 'Copied') : (labels?.copy ?? 'Copy response')" :title="copied ? (labels?.copied ?? 'Copied') : (labels?.copy ?? 'Copy response')" :while-press="reduce ? undefined : { scale: 0.9 }" :transition="pressSpring" @click="copy"><AgentIcon :name="copied ? 'Check' : 'Copy'" :size="14" /></motion.button>
          <motion.button v-if="hasRetry()" type="button" class="sr-action" :aria-label="labels?.retry ?? 'Retry response'" :title="labels?.retry ?? 'Retry response'" :while-press="reduce ? undefined : { scale: 0.9 }" :transition="pressSpring" @click="emit('retry')"><AgentIcon name="RotateCcw" :size="14" /></motion.button>
          <template v-if="complete">
            <motion.button type="button" class="sr-action" :data-active="vote === 'up' || undefined" :aria-pressed="vote === 'up'" :aria-label="labels?.helpful ?? 'Helpful'" :title="labels?.helpful ?? 'Helpful'" :while-press="reduce ? undefined : { scale: 0.9 }" :transition="pressSpring" @click="toggleVote('up')"><AgentIcon name="ThumbsUp" :size="14" /></motion.button>
            <motion.button type="button" class="sr-action" :data-active="vote === 'down' || undefined" :aria-pressed="vote === 'down'" :aria-label="labels?.notHelpful ?? 'Not helpful'" :title="labels?.notHelpful ?? 'Not helpful'" :while-press="reduce ? undefined : { scale: 0.9 }" :transition="pressSpring" @click="toggleVote('down')"><AgentIcon name="ThumbsDown" :size="14" /></motion.button>
          </template>
          <button v-if="hasSources" type="button" class="sr-sources" :aria-expanded="sourcesOpen" :aria-controls="sourcesContentId" @click="setSourcesOpen(!sourcesOpen)">
            <CitationStack :citations="sources" />
            <span class="sr-tabular">{{ sources.length === 1 ? t('source', '{count} source', { count: sources.length }) : t('sources', '{count} sources', { count: sources.length }) }}</span>
            <motion.span aria-hidden="true" class="sr-chevron" :initial="false" :animate="{ rotate: sourcesOpen ? 180 : 0 }" :transition="reduce ? { duration: 0 } : swapSpring"><AgentIcon name="ChevronDown" :size="12" /></motion.span>
          </button>
        </div>
        <AgentReveal v-if="hasSources" :id="sourcesContentId" :open="sourcesOpen">
          <CitationList :citations="sources" :id-prefix="sourcePrefix" class="sr-list" />
        </AgentReveal>
      </motion.div>
    </AnimatePresence>
  </div>
</template>

<style scoped>
.sr { width: 100%; }
.sr-content { font-size: .875rem; line-height: 1.5rem; color: color-mix(in oklab, var(--beui-foreground) 90%, transparent); }
.sr-content :deep(a) { font-weight: 500; text-decoration: underline; text-underline-offset: 4px; color: inherit; }
.sr-content :deep(code) { border-radius: .25rem; background: var(--beui-muted); padding: .125rem .25rem; font-family: var(--font-mono, ui-monospace, monospace); font-size: .9em; }
.sr-content :deep(p) { margin: 0; }
.sr-content :deep(p), .sr-content :deep(li), .sr-content :deep(code) { color: inherit; line-height: inherit; overflow-wrap: normal; }
.sr-content :deep(p), .sr-content :deep(li) { font-size: inherit; }
.sr-content :deep(p + p) { margin-top: .75rem; }
.sr-content :deep(ul), .sr-content :deep(ol) { margin: .75rem 0; padding: 0 0 0 1.25rem; }
.sr-content :deep(ul) { list-style: disc; }
.sr-content :deep(ol) { list-style: decimal; }
.sr-content :deep(li) { margin: 0; }
.sr-content :deep(li + li) { margin-top: .25rem; }
.sr-content :deep(pre) { margin: .75rem 0; overflow-x: auto; border: 1px solid var(--beui-border); border-radius: .75rem; background: color-mix(in oklab, var(--beui-muted) 45%, transparent); padding: .75rem; }
.sr-content :deep(pre code) { background: transparent; padding: 0; }
.sr-footer { margin-top: .75rem; }
.sr-actions { display: flex; align-items: center; gap: .125rem; }
.sr-action { display: grid; width: 1.75rem; height: 1.75rem; place-items: center; padding: 0; border: 0; border-radius: .375rem; background: none; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color .15s, background-color .15s; }
.sr-action:hover, .sr-action[data-active] { background: var(--beui-muted); color: var(--beui-foreground); }
.sr-action:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.sr-sources { display: inline-flex; min-height: 1.75rem; align-items: center; gap: .5rem; margin-left: .25rem; padding: 0 .375rem; border: 0; border-radius: .375rem; background: none; font: inherit; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color .15s; }
.sr-sources:hover { color: var(--beui-foreground); }
.sr-sources:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.sr-tabular { font-variant-numeric: tabular-nums; }
.sr-chevron { display: inline-flex; color: color-mix(in oklab, var(--beui-muted-foreground) 50%, transparent); }
.sr-sources:hover .sr-chevron { color: var(--beui-muted-foreground); }
.sr-list { margin-top: .5rem; border-radius: .75rem; background: var(--beui-muted); padding: .5rem; }
</style>

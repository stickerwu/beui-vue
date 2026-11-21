<script lang="ts">
export const codeBlockMessages = { writing: 'Writing', ready: 'Ready', copy: 'Copy code', copied: 'Copied' }
</script>
<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { pressSpring } from '../core/motion'
import AgentCodeLine from './AgentCodeLine.vue'
import AgentIcon from './AgentIcon.vue'
import './agent-tokens.css'
import { useCopy, type Labels } from './shared'

const props = withDefaults(defineProps<{
  code: string, language?: string, filename?: string, status?: 'streaming' | 'complete', showLineNumbers?: boolean, highlightLines?: number[],
  maxHeight?: number, wrap?: boolean, copyable?: boolean, onCopy?: () => void | Promise<void>, labels?: Labels
}>(), { language: 'typescript', status: 'complete', showLineNumbers: true, highlightLines: () => [], maxHeight: 280, copyable: true })
const reduce = useReducedMotion()
const { copied, copy } = useCopy()
const viewport = useTemplateRef<HTMLElement>('viewport')
const streaming = computed(() => props.status === 'streaming')
const lines = computed(() => props.code.split('\n'))
const highlighted = computed(() => new Set(props.highlightLines))
const t = (key: keyof typeof codeBlockMessages) => props.labels?.[key] ?? codeBlockMessages[key]

let frame = 0
watch(() => [props.code, props.status] as const, () => {
  cancelAnimationFrame(frame)
  if (!streaming.value) return
  frame = requestAnimationFrame(() => {
    const el = viewport.value
    if (!el || el.scrollHeight <= el.clientHeight) return
    el.scrollTo({ top: el.scrollHeight, behavior: reduce.value ? 'auto' : 'smooth' })
  })
}, { flush: 'post' })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>
<template>
  <div class="be-ag be-cb" :data-state="status" :aria-busy="streaming">
    <div class="be-cb-head">
      <AgentIcon name="FileCode2" :size="14" class="be-cb-file" />
      <span v-if="filename || $slots.filename" class="be-cb-name"><slot name="filename">{{ filename }}</slot></span>
      <span class="be-cb-lang">{{ language }}</span>
      <span class="be-cb-status" :data-streaming="streaming"><AgentIcon v-if="streaming" name="LoaderCircle" :size="12" :class="{ 'be-ag-spin': !reduce }" /><AgentIcon v-else name="Check" :size="12" />{{ streaming ? t('writing') : t('ready') }}</span>
      <motion.button v-if="copyable || onCopy" type="button" class="be-cb-copy" :aria-label="copied ? t('copied') : t('copy')" :title="copied ? t('copied') : t('copy')" :while-press="reduce ? undefined : { scale: 0.9 }" :transition="pressSpring" @click="copy(code, onCopy)"><AgentIcon :name="copied ? 'Check' : 'Copy'" :size="14" /></motion.button>
    </div>
    <div ref="viewport" class="be-cb-body be-ag-hide-scroll" :role="streaming ? 'log' : undefined" :aria-live="streaming ? 'polite' : undefined" :style="{ maxHeight: `${maxHeight}px` }">
      <pre class="be-cb-pre"><code><span v-for="(line, index) in lines" :key="index" class="be-cb-line" :data-numbers="showLineNumbers" :data-highlight="highlighted.has(index + 1) || undefined"><span v-if="showLineNumbers" class="be-cb-num">{{ index + 1 }}</span><AgentCodeLine :code="line" :language="language" class="be-cb-code" :data-wrap="wrap || undefined" /></span></code></pre>
    </div>
  </div>
</template>
<style scoped>
.be-cb { box-sizing: border-box; width: 100%; overflow: hidden; border-radius: 1rem; background: color-mix(in srgb, var(--beui-muted) 80%, transparent); font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.be-cb-head { display: flex; height: 2.5rem; align-items: center; gap: 0.625rem; padding-inline: 0.75rem; }
.be-cb-file { color: color-mix(in srgb, var(--beui-muted-foreground) 70%, transparent); }
.be-cb-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.75rem; line-height: 1rem; color: color-mix(in srgb, var(--beui-foreground) 80%, transparent); }
.be-cb-lang { font-size: 10px; line-height: 1rem; font-weight: 500; letter-spacing: 0.025em; text-transform: uppercase; color: color-mix(in srgb, var(--beui-muted-foreground) 55%, transparent); }
.be-cb-status { margin-inline-start: auto; display: inline-flex; flex: none; align-items: center; gap: 0.25rem; font-size: 10px; line-height: 1rem; font-weight: 500; color: var(--ag-green); }
.be-cb-status[data-streaming=true] { color: var(--ag-blue); }
.be-cb-copy { display: grid; flex: none; width: 1.75rem; height: 1.75rem; place-items: center; padding: 0; border: 0; border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color 0.15s, background-color 0.15s; }
.be-cb-copy:hover { background: color-mix(in srgb, var(--beui-background) 70%, transparent); color: var(--beui-foreground); }
.be-cb-copy:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-cb-body { overflow: auto; border-top: 1px solid color-mix(in srgb, var(--beui-foreground) 6%, transparent); padding-block: 0.5rem; }
.be-cb-pre { margin: 0; min-width: max-content; font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.75rem; line-height: 1.25rem; color: color-mix(in srgb, var(--beui-foreground) 85%, transparent); }
.be-cb-pre code { font: inherit; }
.be-cb-line { display: grid; min-height: 1.25rem; grid-template-columns: minmax(0, 1fr); }
.be-cb-line[data-numbers=true] { grid-template-columns: 2.75rem minmax(0, 1fr); }
.be-cb-line[data-highlight] { background: oklch(62.3% 0.214 259.815 / 0.07); }
.be-cb-num { user-select: none; padding-right: 0.75rem; text-align: right; font-variant-numeric: tabular-nums; color: color-mix(in srgb, var(--beui-muted-foreground) 35%, transparent); }
.be-cb-code { padding-right: 1rem; padding-left: 1rem; white-space: pre; }
.be-cb-line[data-numbers=true] .be-cb-code { padding-left: 0.25rem; }
.be-cb-code[data-wrap] { white-space: pre-wrap; overflow-wrap: break-word; }
</style>

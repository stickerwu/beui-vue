<script setup lang="ts">
import { shallowRef } from 'vue'
import Citations from './Citations.vue'
import { useCopy, useValue, type CitationItem, type Labels } from './shared'
type Feedback = 'up' | 'down' | null
const props = withDefaults(defineProps<{
  status?: 'streaming' | 'complete' | 'error', copyText?: string, onCopy?: () => void | Promise<void>, onRetry?: () => void,
  sources?: CitationItem[], sourcesOpen?: boolean, defaultSourcesOpen?: boolean, sourceIdPrefix?: string,
  feedback?: Feedback, defaultFeedback?: Feedback, announce?: boolean, showActions?: boolean, labels?: Labels, contentClassName?: string, actionsClassName?: string
}>(), { status: 'streaming', sources: () => [], sourcesOpen: undefined, defaultSourcesOpen: false, defaultFeedback: null, announce: true, showActions: true })
const emit = defineEmits<{ 'update:feedback': [value: Feedback], feedbackChange: [value: Feedback], 'update:sourcesOpen': [value: boolean], sourcesOpenChange: [value: boolean] }>()
const { value: vote, set } = useValue(() => props.feedback, props.defaultFeedback, next => { emit('update:feedback', next); emit('feedbackChange', next) })
const { copy, copied } = useCopy()
const text = shallowRef<HTMLElement | null>(null)
</script>
<template>
  <div class="be-response" :data-status="status">
    <div ref="text" :class="contentClassName" :aria-live="announce ? 'polite' : 'off'" :aria-busy="status === 'streaming'"><slot /><span v-if="status === 'streaming'" class="be-response-cursor" aria-hidden="true" /></div>
    <div v-if="showActions && status !== 'streaming'" class="be-agent-actions" :class="actionsClassName">
      <button v-if="copyText || onCopy" type="button" class="be-agent-button" :aria-label="copied ? 'Copied' : (labels?.copy ?? 'Copy response')" @click="copy(copyText ?? text?.innerText ?? '', onCopy)">{{ copied ? '✓' : '⧉' }}</button>
      <button v-if="onRetry" type="button" class="be-agent-button" :aria-label="labels?.retry ?? 'Retry response'" @click="onRetry">↻</button>
      <template v-if="status === 'complete'"><button type="button" class="be-agent-button" :aria-label="labels?.helpful ?? 'Helpful'" :aria-pressed="vote === 'up'" @click="set(vote === 'up' ? null : 'up')">＋</button><button type="button" class="be-agent-button" :aria-label="labels?.notHelpful ?? 'Not helpful'" :aria-pressed="vote === 'down'" @click="set(vote === 'down' ? null : 'down')">−</button></template>
    </div>
    <Citations v-if="sources.length && status !== 'streaming' && showActions" :citations="sources" :open="sourcesOpen" :default-open="defaultSourcesOpen" :id-prefix="sourceIdPrefix" @update:open="emit('update:sourcesOpen', $event); emit('sourcesOpenChange', $event)" />
  </div>
</template>
<style scoped>.be-response{display:grid;gap:.5rem;width:100%;font-size:.875rem;line-height:1.6}.be-response-cursor{display:inline-block;width:.4rem;height:1em;margin-left:.2rem;vertical-align:text-bottom;background:currentColor;animation:be-cursor 1s ease-in-out infinite alternate}@keyframes be-cursor{to{opacity:.15}}@media(prefers-reduced-motion:reduce){.be-response-cursor{animation:none}}</style>

<script lang="ts">
export const toolApprovalMessages = {
  title: 'Allow this tool to run?', viewDetails: 'View details', allowOnce: 'Allow once', alwaysAllow: 'Always allow', deny: 'Deny',
  pending: 'Approval required', approving: 'Approving', approved: 'Approved', denied: 'Denied', running: 'Running', complete: 'Completed', error: 'Failed',
}
export type ToolApprovalStatus = 'pending' | 'approving' | 'approved' | 'denied' | 'running' | 'complete' | 'error'
export type ToolApprovalParameter = { id: string, label: string, value: string }
</script>
<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, useId, watch } from 'vue'
import { easeOut, pressSpring, swapSpring } from '../core/motion'
import { useOpenState } from '../primitives/state'
import AgentIcon from './AgentIcon.vue'
import AgentReveal from './AgentReveal.vue'
import './agent-tokens.css'
import type { Labels } from './shared'

const props = withDefaults(defineProps<{
  tool: string, title?: string, description?: string, status?: ToolApprovalStatus, parameters?: ToolApprovalParameter[],
  open?: boolean, defaultOpen?: boolean, labels?: Labels, onAlwaysAllow?: () => void
}>(), { status: 'pending', parameters: () => [], open: undefined, defaultOpen: false })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean], approve: [], deny: [] }>()
const reduce = useReducedMotion()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
const uid = useId()
const t = (key: keyof typeof toolApprovalMessages) => props.labels?.[key] ?? toolApprovalMessages[key]
const busy = computed(() => props.status === 'approving' || props.status === 'running')
const pending = computed(() => props.status === 'pending')
const error = computed(() => props.status === 'error')
const icon = computed(() => busy.value ? 'LoaderCircle' : error.value ? 'CircleAlert' : props.status === 'denied' ? 'X' : props.status === 'approved' || props.status === 'complete' ? 'Check' : 'ShieldCheck')
const tone = computed(() => pending.value ? 'amber' : busy.value ? 'blue' : props.status === 'approved' || props.status === 'complete' ? 'green' : 'rose')

watch(() => props.status, (next, previous) => { if (previous === 'pending' && next !== 'pending') setOpen(false) })
</script>
<template>
  <div class="be-ag be-ta" :data-state="status" :aria-busy="busy">
    <div class="be-ta-head">
      <span aria-hidden="true" class="be-ta-icon" :data-error="error || undefined"><AgentIcon :name="icon" :size="16" :class="{ 'be-ag-spin': busy && !reduce }" /></span>
      <div class="be-ta-main">
        <div class="be-ta-row">
          <div class="be-ta-heading">
            <div class="be-ta-title">{{ title ?? t('title') }}</div>
            <div class="be-ta-tool">{{ tool }}</div>
          </div>
          <span class="be-ta-badge" role="status" :data-tone="tone">{{ t(status) }}</span>
        </div>
        <p v-if="description" class="be-ta-desc">{{ description }}</p>
        <button v-if="parameters.length || $slots.default" type="button" class="be-ta-toggle" :aria-expanded="open" :aria-controls="`${uid}-details`" @click="setOpen(!open)">
          {{ t('viewDetails') }}
          <motion.span aria-hidden="true" class="be-ta-chevron" :animate="{ rotate: open ? 180 : 0 }" :transition="reduce ? { duration: 0 } : swapSpring"><AgentIcon name="ChevronDown" :size="14" /></motion.span>
        </button>
      </div>
    </div>
    <AgentReveal :id="`${uid}-details`" :open="open">
      <dl class="be-ta-params">
        <div v-for="parameter in parameters" :key="parameter.id" class="be-ta-param">
          <dt>{{ parameter.label }}</dt>
          <dd><slot name="parameter" :parameter="parameter">{{ parameter.value }}</slot></dd>
        </div>
        <slot />
      </dl>
    </AgentReveal>
    <AnimatePresence :initial="false">
      <motion.div v-if="pending" key="actions" class="be-ta-actions" :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 4 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }" :transition="{ duration: reduce ? 0.12 : 0.22, ease: easeOut }">
        <motion.button type="button" class="be-ta-btn" data-kind="solid" :while-press="reduce ? undefined : { scale: 0.97 }" :transition="pressSpring" @click="emit('approve')">{{ t('allowOnce') }}</motion.button>
        <motion.button v-if="onAlwaysAllow" type="button" class="be-ta-btn" data-kind="outline" :while-press="reduce ? undefined : { scale: 0.97 }" :transition="pressSpring" @click="onAlwaysAllow">{{ t('alwaysAllow') }}</motion.button>
        <button type="button" class="be-ta-btn" data-kind="ghost" @click="emit('deny')">{{ t('deny') }}</button>
      </motion.div>
    </AnimatePresence>
  </div>
</template>
<style scoped>
.be-ta { box-sizing: border-box; width: 100%; overflow: hidden; border: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); border-radius: 1rem; background: color-mix(in srgb, var(--beui-muted) 20%, transparent); font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.be-ta-head { display: flex; align-items: flex-start; gap: 0.75rem; padding: 1rem; }
.be-ta-icon { display: grid; flex: none; width: 2rem; height: 2rem; margin-top: 0.125rem; place-items: center; border: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); border-radius: 0.75rem; background: var(--beui-background); color: var(--beui-muted-foreground); }
.be-ta-icon[data-error] { color: var(--beui-destructive); }
.be-ta-main { min-width: 0; flex: 1; }
.be-ta-row { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
.be-ta-heading { min-width: 0; }
.be-ta-title { font-weight: 500; color: var(--beui-foreground); }
.be-ta-tool { margin-top: 0.125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono, ui-monospace, monospace); font-size: 0.75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.be-ta-badge { flex: none; border: 1px solid; border-radius: 9999px; padding: 0.125rem 0.5rem; font-size: 11px; line-height: 1rem; font-weight: 500; transition: color 0.15s, background-color 0.15s, border-color 0.15s; }
.be-ta-badge[data-tone=amber] { border-color: color-mix(in srgb, var(--ag-amber-500) 30%, transparent); background: color-mix(in srgb, var(--ag-amber-500) 10%, transparent); color: var(--ag-amber); }
.be-ta-badge[data-tone=blue] { border-color: color-mix(in srgb, var(--ag-blue-500) 30%, transparent); background: color-mix(in srgb, var(--ag-blue-500) 10%, transparent); color: var(--ag-blue); }
.be-ta-badge[data-tone=green] { border-color: color-mix(in srgb, var(--ag-green-500) 30%, transparent); background: color-mix(in srgb, var(--ag-green-500) 10%, transparent); color: var(--ag-green); }
.be-ta-badge[data-tone=rose] { border-color: color-mix(in srgb, var(--ag-rose-500) 30%, transparent); background: color-mix(in srgb, var(--ag-rose-500) 10%, transparent); color: var(--ag-rose); }
.be-ta-desc { margin: 0.5rem 0 0; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.be-ta-toggle { display: inline-flex; align-items: center; gap: 0.25rem; margin-top: 0.5rem; padding: 0; border: 0; border-radius: 0.375rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; font-weight: 500; cursor: pointer; outline: none; transition: color 0.15s; }
.be-ta-toggle:hover { color: var(--beui-foreground); }
.be-ta-toggle:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-ta-chevron { display: inline-flex; }
.be-ta-params { display: grid; gap: 0.5rem; margin: 0 1rem 1rem; padding: 0.75rem; border: 1px solid color-mix(in srgb, var(--beui-border) 50%, transparent); border-radius: 0.75rem; background: color-mix(in srgb, var(--beui-background) 70%, transparent); }
.be-ta-param { display: grid; grid-template-columns: minmax(0, 7rem) minmax(0, 1fr); align-items: center; gap: 0.75rem; font-size: 0.75rem; line-height: 1rem; }
.be-ta-param dt { margin: 0; color: var(--beui-muted-foreground); }
.be-ta-param dd { min-width: 0; margin: 0; overflow-wrap: break-word; font-family: var(--font-mono, ui-monospace, monospace); color: color-mix(in srgb, var(--beui-foreground) 85%, transparent); }
.be-ta-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; border-top: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); padding: 0.75rem 1rem; }
.be-ta-btn { padding: 0.375rem 0.75rem; border: 0; border-radius: 0.75rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; font-weight: 500; cursor: pointer; outline: none; transition: color 0.15s, background-color 0.15s; }
.be-ta-btn:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.be-ta-btn:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-ta-btn[data-kind=solid] { background: var(--beui-foreground); color: var(--beui-background); }
.be-ta-btn[data-kind=solid]:hover { background: var(--beui-foreground); color: var(--beui-background); }
.be-ta-btn[data-kind=solid]:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-ta-btn[data-kind=outline] { border: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); background: var(--beui-background); color: var(--beui-foreground); }
.be-ta-btn[data-kind=outline]:hover { background: var(--beui-muted); }
</style>

<script lang="ts">
export const todoListMessages = {
  title: 'To-dos', label: 'Agent task list', progress: '{completed} of {total} tasks completed', empty: 'No tasks yet',
  pending: 'Pending', inProgress: 'In progress', completed: 'Completed', cancelled: 'Cancelled',
}
export type TodoItemStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled'
/** `progress` is a percentage (0 to 100); leave it out for an indeterminate spinner. */
export type TodoItem = { id: string, title: string, status?: TodoItemStatus, progress?: number, detail?: string }
</script>
<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, useId, useTemplateRef, watch } from 'vue'
import { easeOut, layoutSpring, swapSpring } from '../core/motion'
import { useOpenState } from '../primitives/state'
import AgentIcon from './AgentIcon.vue'
import AgentReveal from './AgentReveal.vue'
import AgentRollText from './AgentRollText.vue'
import './agent-tokens.css'
import type { Labels } from './shared'

const props = withDefaults(defineProps<{ items: TodoItem[], title?: string, open?: boolean, defaultOpen?: boolean, collapseOnComplete?: boolean, maxHeight?: number, labels?: Labels }>(), { open: undefined, defaultOpen: true, collapseOnComplete: true, maxHeight: 248 })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
const reduce = useReducedMotion()
const { open, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })
const uid = useId()
const viewport = useTemplateRef<HTMLElement>('viewport')
const format = (value: number) => new Intl.NumberFormat('en').format(value)
const t = (key: keyof typeof todoListMessages, values?: Record<string, string | number>) => (props.labels?.[key] ?? todoListMessages[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ''))
const completed = computed(() => props.items.filter(item => item.status === 'completed').length)
const allComplete = computed(() => props.items.length > 0 && completed.value === props.items.length)
const statusKey = { pending: 'pending', 'in-progress': 'inProgress', completed: 'completed', cancelled: 'cancelled' } as const
const progressOf = (item: TodoItem) => item.progress === undefined ? 0.68 : Math.min(100, Math.max(0, item.progress)) / 100
const spinning = (item: TodoItem) => (item.status ?? 'pending') === 'in-progress' && item.progress === undefined && !reduce.value
const statusTransition = (item: TodoItem) => spinning(item) ? { rotate: { duration: 1.1, repeat: Infinity, ease: 'linear' } } : reduce.value ? { duration: 0 } : layoutSpring
const sweep = computed(() => reduce.value ? { duration: 0 } : { duration: 0.24, ease: easeOut })

watch(allComplete, (next, previous) => {
  if (previous && !next) setOpen(true)
  if (!previous && next && props.collapseOnComplete) setOpen(false)
})

let frame = 0
watch(() => [props.items.length, reduce.value] as const, ([count]) => {
  cancelAnimationFrame(frame)
  if (!count) return
  frame = requestAnimationFrame(() => {
    const el = viewport.value
    if (!el || el.scrollHeight <= el.clientHeight) return
    el.scrollTo({ top: el.scrollHeight, behavior: reduce.value ? 'auto' : 'smooth' })
  })
}, { flush: 'post' })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>
<template>
  <section class="be-ag be-td" :aria-label="t('label')">
    <button :id="`${uid}-trigger`" type="button" class="be-td-trigger" :aria-expanded="open" :aria-controls="`${uid}-content`" @click="setOpen(!open)">
      <span aria-hidden="true" class="be-td-headicon">
        <AnimatePresence :initial="false" mode="popLayout">
          <motion.svg tabindex="-1" v-if="allComplete" key="complete" viewBox="0 0 24 24" class="be-td-done" :initial="reduce ? { opacity: 1 } : { opacity: 0, scale: 0.72 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0 }" :transition="reduce ? { duration: 0 } : swapSpring">
            <circle cx="12" cy="12" r="9" fill="currentColor" />
            <motion.path tabindex="-1" d="M7.5 12.25 10.5 15.25 16.75 8.75" fill="none" stroke="white" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" :initial="reduce ? { pathLength: 1 } : { pathLength: 0 }" :animate="{ pathLength: 1 }" :transition="sweep" />
          </motion.svg>
          <motion.span v-else key="todo" class="be-td-list" :initial="reduce ? { opacity: 1 } : { opacity: 0, scale: 0.8 }" :animate="{ opacity: 1, scale: 1 }" :exit="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.72 }" :transition="reduce ? { duration: 0 } : swapSpring"><AgentIcon name="ListTodo" :size="16" /></motion.span>
        </AnimatePresence>
      </span>
      <h3 class="be-td-title"><slot name="title">{{ title ?? t('title') }}</slot></h3>
      <span class="be-td-count" :data-complete="allComplete || undefined">
        <span class="be-ag-sr">{{ t('progress', { completed, total: items.length }) }}</span>
        <span aria-hidden="true" class="be-td-numbers"><AgentRollText :value="String(completed)">{{ format(completed) }}</AgentRollText><span>/</span><span>{{ format(items.length) }}</span></span>
      </span>
      <motion.span aria-hidden="true" class="be-td-chevron" :animate="{ rotate: open ? 180 : 0 }" :transition="reduce ? { duration: 0 } : swapSpring"><AgentIcon name="ChevronDown" :size="14" /></motion.span>
    </button>
    <AgentReveal :id="`${uid}-content`" role="region" :aria-labelledby="`${uid}-trigger`" :open="open">
      <div ref="viewport" class="be-td-viewport be-ag-hide-scroll" :style="{ maxHeight: `${maxHeight}px` }">
        <ol v-if="items.length" aria-live="polite" class="be-td-items">
          <AnimatePresence :initial="false" mode="popLayout">
            <motion.li v-for="item in items" :key="item.id" layout="position" class="be-td-item" :data-status="item.status ?? 'pending'" :initial="reduce ? { opacity: 1 } : { opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :exit="reduce ? { opacity: 0 } : { opacity: 0, y: -3 }" :transition="reduce ? { duration: 0 } : { opacity: { duration: 0.18, ease: easeOut }, y: layoutSpring, layout: layoutSpring }">
              <motion.svg tabindex="-1" aria-hidden="true" viewBox="0 0 24 24" class="be-td-status" :data-status="item.status ?? 'pending'" :initial="false">
                <motion.circle tabindex="-1" cx="12" cy="12" r="9" fill="currentColor" stroke="currentColor" stroke-width="1.5" :stroke-dasharray="(item.status ?? 'pending') === 'pending' ? '2 3' : undefined" stroke-linecap="round" :initial="false" :animate="{ fillOpacity: item.status === 'completed' ? 0.06 : 0 }" :transition="reduce ? { duration: 0 } : { duration: 0.18, ease: easeOut }" :class="{ 'be-td-faint': item.status === 'in-progress' }" />
                <motion.circle tabindex="-1" cx="12" cy="12" r="9" path-length="1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" :initial="false" :animate="{ pathLength: item.status === 'in-progress' ? progressOf(item) : 0, opacity: item.status === 'in-progress' ? 1 : 0, rotate: spinning(item) ? 360 : -90 }" :transition="statusTransition(item)" style="transform-origin: 12px 12px" />
                <motion.path tabindex="-1" d="M7.5 12.25 10.5 15.25 16.75 8.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :initial="false" :animate="{ pathLength: item.status === 'completed' ? 1 : 0, opacity: item.status === 'completed' ? 1 : 0 }" :transition="sweep" />
                <motion.path tabindex="-1" d="M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" :initial="false" :animate="{ pathLength: item.status === 'cancelled' ? 1 : 0, opacity: item.status === 'cancelled' ? 1 : 0 }" :transition="reduce ? { duration: 0 } : { duration: 0.2, ease: easeOut }" />
              </motion.svg>
              <span class="be-ag-sr">{{ t(statusKey[item.status ?? 'pending']) }}: </span>
              <span class="be-td-text"><span class="be-td-label"><slot name="item" :item="item">{{ item.title }}</slot><motion.span aria-hidden="true" class="be-td-strike" :initial="false" :animate="{ scaleX: item.status === 'completed' ? 1 : 0, opacity: item.status === 'completed' ? 1 : 0 }" :transition="reduce ? { duration: 0 } : { duration: 0.28, ease: easeOut, delay: 0.06 }" /></span></span>
              <span v-if="item.detail" class="be-td-detail">{{ item.detail }}</span>
            </motion.li>
          </AnimatePresence>
        </ol>
        <p v-else class="be-td-empty">{{ t('empty') }}</p>
      </div>
    </AgentReveal>
  </section>
</template>
<style scoped>
.be-td { box-sizing: border-box; width: 100%; overflow: hidden; border: 1px solid color-mix(in srgb, var(--beui-border) 70%, transparent); border-radius: 1rem; font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.be-td-trigger { display: flex; box-sizing: border-box; height: 2.75rem; width: 100%; align-items: center; gap: 0.625rem; padding: 0 0.875rem; border: 0; border-radius: 1rem; background: transparent; color: inherit; font: inherit; text-align: start; cursor: pointer; outline: none; }
.be-td-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-td-headicon { position: relative; display: grid; flex: none; width: 1.5rem; height: 1.5rem; place-items: center; }
.be-td-done { position: absolute; width: 1.375rem; height: 1.375rem; overflow: visible; color: var(--ag-green-500); }
.be-td-list { position: absolute; display: grid; place-items: center; color: var(--beui-muted-foreground); }
.be-td-title { min-width: 0; flex: 1; margin: 0; padding: 0; border: 0; letter-spacing: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: color-mix(in srgb, var(--beui-foreground) 90%, transparent); }
.be-td-count { flex: none; font-size: 0.75rem; line-height: 1rem; font-weight: 500; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.be-td-count[data-complete] { color: var(--ag-green); }
.be-td-numbers { display: inline-flex; }
.be-td-chevron { display: inline-flex; color: color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent); transition: color 0.15s; }
.be-td-trigger:hover .be-td-chevron { color: var(--beui-muted-foreground); }
.be-td-viewport { overflow-y: auto; padding: 0 0.5rem 0.5rem; }
.be-td-items { margin: 0; padding: 0; list-style: none; }
.be-td-item { display: flex; box-sizing: border-box; min-height: 2.25rem; align-items: center; gap: 0.625rem; padding: 0.25rem 0.375rem; border-radius: 0.75rem; }
.be-td-status { flex: none; width: 1.25rem; height: 1.25rem; margin-inline: 0.125rem; overflow: visible; color: var(--beui-muted-foreground); }
.be-td-status[data-status=in-progress] { color: var(--beui-foreground); }
.be-td-status[data-status=cancelled] { color: var(--ag-rose); }
.be-td-faint { opacity: 0.2; }
.be-td-text { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.875rem; line-height: 1.25rem; color: color-mix(in srgb, var(--beui-muted-foreground) 65%, transparent); }
.be-td-item[data-status=in-progress] .be-td-text { color: var(--beui-foreground); }
.be-td-item[data-status=completed] .be-td-text { color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); }
.be-td-item[data-status=cancelled] .be-td-text { color: color-mix(in srgb, var(--beui-muted-foreground) 55%, transparent); }
.be-td-label { position: relative; display: inline-block; max-width: 100%; }
.be-td-strike { position: absolute; inset-inline: 0; top: 50%; height: 1px; transform-origin: left; background: currentColor; }
.be-td-detail { flex: none; font-size: 0.875rem; line-height: 1.25rem; color: color-mix(in srgb, var(--beui-muted-foreground) 55%, transparent); }
.be-td-empty { margin: 0; padding: 0.5rem 0.375rem; font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
</style>

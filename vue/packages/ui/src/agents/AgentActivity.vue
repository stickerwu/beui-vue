<script lang="ts">
export { agentActivityMessages } from './activity-types'
export type { ActivityItem, AgentActivityMessages, AgentSearchResult, AgentStepStatus, AgentTraceKind } from './activity-types'
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue'
import { easeOut, layoutSpring, swapSpring } from '../core/motion'
import { useOpenState } from '../primitives/state'
import ThinkingShimmer from '../effects/ThinkingShimmer.vue'
import ActivityRow from './ActivityRow.vue'
import AgentIcon from './AgentIcon.vue'
import AgentReveal from './AgentReveal.vue'
import { agentActivityMessages, type ActivityContentType, type ActivityItem, type AgentActivityTranslate, type AgentSearchResult } from './activity-types'
import type { Labels } from './shared'

const props = withDefaults(defineProps<{
  items: ActivityItem[], contentType?: ActivityContentType, status?: 'working' | 'complete', duration?: number,
  open?: boolean, defaultOpen?: boolean, collapseOnComplete?: boolean, activeLabel?: string, summary?: string, maxHeight?: number, labels?: Labels, contentClassName?: string
}>(), { status: 'working', duration: 0, open: undefined, defaultOpen: false, collapseOnComplete: true, maxHeight: 208 })
const emit = defineEmits<{ 'update:open': [value: boolean], openChange: [value: boolean] }>()
defineSlots<{
  /** Replaces the live status line while the run is working. */
  renderWorkingStatus?(props: { label: string, duration: number }): unknown
  /** Replaces the summary inside the completed disclosure trigger. */
  renderCompletedStatus?(props: { summary: string, duration: number }): unknown
  /** Replaces the row renderer for one item. */
  item?(props: { item: ActivityItem }): unknown
  'result-icon'?(props: { result: AgentSearchResult }): unknown
  'trace-icon'?(props: { item: ActivityItem }): unknown
}>()
const { open: currentOpen, setOpen } = useOpenState(() => props.open, props.defaultOpen, next => { emit('update:open', next); emit('openChange', next) })

const reduce = useReducedMotion()
const baseId = useId()
const triggerId = `${baseId}-trigger`
const contentId = `${baseId}-content`
const contentRef = shallowRef<HTMLElement | { $el: HTMLElement } | null>(null)
const viewportRef = shallowRef<HTMLElement | null>(null)
const contentHeight = shallowRef(0)

const t: AgentActivityTranslate = (key, values) => (props.labels?.[key] ?? agentActivityMessages[key]).replace(/\{(\w+)\}/g, (match, name) => values?.[name] === undefined ? match : String(values[name]))
const working = computed(() => props.status === 'working')
const expanded = computed(() => working.value || currentOpen.value)
const contentType = computed<ActivityContentType>(() => {
  if (!props.items.length) return props.contentType ?? 'mixed'
  const first = props.items[0].type
  return props.items.every(item => item.type === first) ? first : 'mixed'
})
const cappedHeight = computed(() => Math.min(contentHeight.value, Math.max(0, props.maxHeight)))
const viewportHeight = computed(() => working.value ? Math.max(0, props.maxHeight) : cappedHeight.value)
const capped = computed(() => contentHeight.value > props.maxHeight)
const streamOffset = computed(() => working.value ? Math.min(0, viewportHeight.value - contentHeight.value) : 0)
const maskImage = computed(() => !capped.value ? undefined : working.value
  ? 'linear-gradient(to bottom, transparent, black 12px)'
  : 'linear-gradient(to bottom, transparent, black 12px, black calc(100% - 12px), transparent)')

function formatDuration(value: number) {
  const seconds = Math.max(0, Math.round(value))
  if (seconds < 60) return t('seconds', { seconds })
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder === 0 ? t('minutes', { minutes }) : t('minutesSeconds', { minutes, seconds: remainder })
}
const liveLabel = computed(() => {
  if (props.activeLabel) return props.activeLabel
  const type = contentType.value
  if (type === 'search') return t('searching')
  if (type === 'tool') return t('runningTools')
  if (type === 'trace') return t('workingTrace')
  if (type === 'mixed') return t('workingMixed')
  return t('thinking')
})
/** Summary split around the duration so it can keep tabular figures; `parts` is a plain string otherwise. */
const summaryParts = computed<{ text: string } | { before: string, duration: string, after: string }>(() => {
  if (props.summary) return { text: props.summary }
  const type = contentType.value
  const count = props.items.length
  if (type === 'step' || type === 'text') {
    const [before, after = ''] = (props.labels?.thoughtFor ?? agentActivityMessages.thoughtFor).split('{duration}')
    return { before, duration: formatDuration(props.duration), after }
  }
  if (type === 'search') return { text: t('searched') }
  if (type === 'tool') return { text: t(count === 1 ? 'ranToolsOne' : 'ranToolsOther', { count }) }
  if (type === 'trace') {
    const messages = props.items.filter(item => item.type === 'trace' && (item.kind === 'thinking' || item.kind === 'message')).length
    const tools = count - messages
    return { text: t('traceSummary', { toolCalls: t(tools === 1 ? 'toolCallsOne' : 'toolCallsOther', { count: tools }), messages: t(messages === 1 ? 'messagesOne' : 'messagesOther', { count: messages }) }) }
  }
  return { text: t(count === 1 ? 'completedStepsOne' : 'completedStepsOther', { count }) }
})
const summaryText = computed(() => 'text' in summaryParts.value ? summaryParts.value.text : `${summaryParts.value.before}${summaryParts.value.duration}${summaryParts.value.after}`)

let observer: ResizeObserver | undefined
let measureFrame = 0
onMounted(() => {
  const target = contentRef.value
  const node = target && '$el' in target ? target.$el : target
  if (!node) return
  const measure = () => { contentHeight.value = node.offsetHeight }
  measure()
  if (typeof ResizeObserver === 'undefined') return
  // Vue flushes the height change on a microtask, which still runs inside this
  // observer round, so the resize it causes would trip a "ResizeObserver loop"
  // error. React commits the same setState on a later task; match that here.
  observer = new ResizeObserver(() => {
    cancelAnimationFrame(measureFrame)
    measureFrame = requestAnimationFrame(measure)
  })
  observer.observe(node)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(measureFrame)
})

watch(() => props.status, (next, previous) => {
  if (previous === 'working' && next === 'complete') setOpen(!props.collapseOnComplete)
})
let frame = 0
function toggle() {
  const next = !currentOpen.value
  setOpen(next)
  if (next) { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => viewportRef.value?.scrollTo({ top: 0 })) }
}
onBeforeUnmount(() => cancelAnimationFrame(frame))

const enter = computed(() => reduce.value ? { opacity: 1 } : { opacity: 0, y: 6 })
const exit = computed(() => reduce.value ? { opacity: 0 } : { opacity: 0, y: -3 })
const itemTransition = computed(() => reduce.value ? { duration: 0 } : { opacity: { duration: 0.18, ease: easeOut }, y: layoutSpring, layout: layoutSpring })
</script>

<template>
  <div class="aa" :data-state="working ? 'working' : expanded ? 'open' : 'closed'" :data-content="contentType" :aria-busy="working">
    <div v-if="working" :id="triggerId" role="status" class="aa-status">
      <slot name="renderWorkingStatus" :label="liveLabel" :duration="duration"><ThinkingShimmer>{{ liveLabel }}</ThinkingShimmer></slot>
    </div>
    <button v-else :id="triggerId" type="button" class="aa-trigger" :aria-expanded="expanded" :aria-controls="contentId" @click="toggle">
      <span class="aa-summary"><slot name="renderCompletedStatus" :summary="summaryText" :duration="duration">
        <template v-if="'text' in summaryParts">{{ summaryParts.text }}</template>
        <template v-else>{{ summaryParts.before }}<span class="aa-tabular">{{ summaryParts.duration }}</span>{{ summaryParts.after }}</template>
      </slot></span>
      <motion.span aria-hidden="true" class="aa-chevron" :animate="{ rotate: expanded ? 180 : 0 }" :transition="reduce ? { duration: 0 } : swapSpring"><AgentIcon name="ChevronDown" :size="14" /></motion.span>
    </button>

    <AgentReveal :id="contentId" role="region" :aria-labelledby="triggerId" :open="expanded" :open-height="viewportHeight">
      <div ref="viewportRef" class="aa-viewport" :data-scroll="capped && expanded && !working || undefined" :style="{ height: `${viewportHeight}px`, maskImage, WebkitMaskImage: maskImage }">
        <motion.div ref="contentRef" role="list" class="aa-list" :class="contentClassName" :initial="false" :animate="{ y: streamOffset }" :transition="reduce ? { duration: 0 } : layoutSpring">
          <AnimatePresence mode="popLayout">
            <motion.div v-for="item in items" :key="item.id" layout="position" role="listitem" :initial="enter" :animate="{ opacity: 1, y: 0 }" :exit="exit" :transition="itemTransition">
              <slot name="item" :item="item">
                <ActivityRow :item="item" :t="t"><template #result-icon="scope"><slot name="result-icon" v-bind="scope" /></template><template #trace-icon="scope"><slot name="trace-icon" v-bind="scope" /></template></ActivityRow>
              </slot>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </AgentReveal>
  </div>
</template>

<style scoped>
.aa { width: 100%; font-size: .875rem; line-height: 1.25rem; }
.aa-status { display: flex; height: 1.75rem; min-width: 0; align-items: center; color: var(--beui-muted-foreground); }
.aa-trigger { display: flex; height: 1.75rem; min-width: 0; align-items: center; gap: .375rem; padding: 0; border: 0; border-radius: .375rem; background: none; font: inherit; font-weight: 500; text-align: left; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color .15s; }
.aa-trigger:hover { color: var(--beui-foreground); }
.aa-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.aa-summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aa-tabular { font-variant-numeric: tabular-nums; }
.aa-chevron { display: inline-flex; flex: none; color: color-mix(in oklab, var(--beui-muted-foreground) 70%, transparent); }
.aa-trigger:hover .aa-chevron { color: var(--beui-foreground); }
.aa-viewport { box-sizing: border-box; padding-right: .25rem; overflow-y: hidden; scrollbar-width: none; }
.aa-viewport[data-scroll] { overflow-y: auto; }
.aa-viewport::-webkit-scrollbar { display: none; }
.aa-list { display: grid; gap: .125rem; padding-block: .5rem; }
</style>

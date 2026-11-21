<script setup lang="ts">
import { AgentActivity, type ActivityItem } from 'beui-vue'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useAgentVariant } from '../.vitepress/use-agent-variant'

const props = defineProps<{ variant?: string }>()
const { variant, choose, options, fixed } = useAgentVariant(() => props.variant, {
  'streaming-text': 'agents/agent-activity-text', 'reasoning-steps': 'agents/agent-activity-steps', 'web-search': 'agents/agent-activity-search',
  'tool-calls': 'agents/agent-activity-tools', 'mixed-activity': 'agents/agent-activity-mixed', 'agent-trace': 'agents/agent-trace',
})

const REASONING = [
  'Reading the request and separating the content model from its presentation.',
  'The activity shell can stay consistent while each event supplies its own compact renderer.',
  'Text remains freeform so partial tokens can update without recreating the surrounding timeline.',
  'As each sentence wraps, the measured stream moves upward through a single transform instead of repeatedly jumping the native scroll position.',
  'Older context stays available above the fold while the newest tokens remain crisp at the bottom edge.',
  'Once the run finishes, the viewport switches from automatic following to ordinary user-controlled scrolling.',
  'Opening the completed disclosure returns to the beginning so the reasoning can be read in order.',
  'The capped viewport follows the latest sentence and preserves the full log after completion.',
].join('\n')
const CHARACTERS_PER_SECOND = 90
const STEPS = [
  { id: 'brief', label: 'Reading the product brief' },
  { id: 'patterns', label: 'Mapping the interaction patterns' },
  { id: 'states', label: 'Connecting the loading and completion states', meta: '3 states' },
  { id: 'verify', label: 'Verifying the final behavior' },
]
const SEARCH_RESULTS = [
  { id: 'google', title: 'Google for Developers', domain: 'developers.google.com' },
  { id: 'github', title: 'GitHub', domain: 'github.com' },
  { id: 'wikipedia', title: 'Wikipedia', domain: 'wikipedia.org' },
  { id: 'vercel', title: 'Vercel Docs', domain: 'vercel.com/docs' },
]
const MARKS: Record<string, string[]> = {
  google: ['M21.35 12.23c0-.65-.06-1.28-.17-1.89H12v3.79h5.25a4.5 4.5 0 0 1-1.95 2.87v2.46h3.16c1.85-1.71 2.89-4.22 2.89-7.23Z', 'M12 21.75c2.64 0 4.86-.87 6.46-2.29L15.3 17c-.87.58-1.98.92-3.3.92a5.7 5.7 0 0 1-5.35-3.93H3.39v2.54A9.75 9.75 0 0 0 12 21.75Z', 'M6.65 13.99A5.85 5.85 0 0 1 6.34 12c0-.69.12-1.36.31-1.99V7.47H3.39A9.76 9.76 0 0 0 2.25 12c0 1.63.39 3.18 1.14 4.53l3.26-2.54Z', 'M12 6.08c1.44 0 2.73.49 3.75 1.47l2.78-2.78A9.34 9.34 0 0 0 12 2.25a9.75 9.75 0 0 0-8.61 5.22l3.26 2.54A5.7 5.7 0 0 1 12 6.08Z'],
  github: ['M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.58 9.58 0 0 1 12 6.82c.85 0 1.71.11 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.77c0 .27.18.58.69.48A10 10 0 0 0 12 2Z'],
  wikipedia: ['M1.5 4h6v1.2H6l4.08 10.73 1.26-3.12L8.45 5.2H7.2V4h6v1.2h-1.47l1.66 4.57 1.82-4.57H13.8V4h4.9v1.2h-1.45l-3.19 7.92 1.08 2.81L19.48 5.2H18V4h4.5v1.2h-1.42L15.25 20h-1.2l-1.91-4.86L10.18 20H8.92L3.25 5.2H1.5V4Z'],
  vercel: ['m12 3 10 18H2L12 3Z'],
}
const TOOLS: ActivityItem[] = [
  { id: 'read', type: 'tool', action: 'read', target: 'campaign-notes.md' },
  { id: 'edit', type: 'tool', action: 'edit', target: 'launch-plan.ts', additions: 42, deletions: 8 },
  { id: 'run', type: 'tool', action: 'run', target: 'bun test launch' },
]
const ACTIVE_BRIEF: ActivityItem = { id: 'brief', type: 'step', label: 'Reading the launch brief', status: 'active' }
const COMPLETE_BRIEF: ActivityItem = { ...ACTIVE_BRIEF, status: 'complete' }
const PENDING_SEARCH: ActivityItem = { id: 'search', type: 'search', query: 'independent coffee roasters in Portland', results: [] }
const COMPLETE_SEARCH: ActivityItem = {
  ...PENDING_SEARCH,
  results: [
    { id: 'heart', title: 'Heart Coffee', domain: 'heartroasters.com' },
    { id: 'coava', title: 'Coava Coffee', domain: 'coavacoffee.com' },
    { id: 'upper-left', title: 'Upper Left Roasters', domain: 'upperleftroasters.com' },
  ],
  moreCount: 5,
}
const MIXED_FRAMES: ActivityItem[][] = [
  [ACTIVE_BRIEF],
  [COMPLETE_BRIEF, PENDING_SEARCH],
  [COMPLETE_BRIEF, COMPLETE_SEARCH],
  [COMPLETE_BRIEF, COMPLETE_SEARCH, TOOLS[0]],
  [COMPLETE_BRIEF, COMPLETE_SEARCH, TOOLS[0], TOOLS[1], TOOLS[2], { id: 'verify', type: 'step', label: 'Checking the final campaign plan', status: 'complete' }],
]
const TRACE_ITEMS: ActivityItem[] = [
  { id: 'plan', type: 'trace', kind: 'thinking', label: 'Thinking', detail: 'Mapping the interaction flow…' },
  { id: 'decision', type: 'trace', kind: 'message', label: 'Decision', detail: 'Use one compact disclosure' },
  { id: 'write', type: 'trace', kind: 'write', label: 'Draft component', detail: 'components/agents/run-log.tsx' },
  { id: 'verify', type: 'trace', kind: 'run', label: 'Validate types', detail: 'bun run typecheck' },
  { id: 'inspect', type: 'trace', kind: 'read', label: 'Inspect preview', detail: 'activity-preview.png' },
]
const LAYOUT: Record<string, { height: number, width: string }> = {
  'streaming-text': { height: 330, width: '32rem' }, 'reasoning-steps': { height: 330, width: '32rem' }, 'web-search': { height: 330, width: '32rem' },
  'tool-calls': { height: 330, width: '32rem' }, 'mixed-activity': { height: 330, width: '36rem' }, 'agent-trace': { height: 300, width: '36rem' },
}

const run = shallowRef(0)
const reduce = shallowRef(false)
const mounted = shallowRef(false)
const items = shallowRef<ActivityItem[]>([])
const complete = shallowRef(false)
const settings = computed(() => ({
  'streaming-text': { contentType: 'text', maxHeight: 180, duration: REASONING.length / CHARACTERS_PER_SECOND },
  'reasoning-steps': { contentType: 'step', maxHeight: 220, duration: 4.2 },
  'web-search': { contentType: 'search', maxHeight: 220, duration: 0 },
  'tool-calls': { contentType: 'tool', maxHeight: 220, duration: 0 },
  'mixed-activity': { contentType: undefined, maxHeight: 220, duration: 5.1 },
  'agent-trace': { contentType: 'trace', maxHeight: 190, duration: 0 },
} as const)[variant.value as 'agent-trace'] ?? { contentType: undefined, maxHeight: 220, duration: 0 })

function stepItems(visible: number, settled: boolean): ActivityItem[] {
  return STEPS.slice(0, visible).map((step, index) => ({ ...step, type: 'step' as const, status: settled || index < visible - 1 ? 'complete' as const : 'active' as const }))
}
function searchItems(visible: number): ActivityItem[] {
  return [{ id: 'search', type: 'search', query: 'accessible animation patterns for Vue', results: SEARCH_RESULTS.slice(0, visible), moreCount: visible === SEARCH_RESULTS.length ? 7 : undefined }]
}
function textItems(text: string): ActivityItem[] {
  return text.split('\n').filter(Boolean).map((content, index) => ({ id: `reasoning-${index}`, type: 'text' as const, content }))
}
/** Final (reduced-motion) frame for each example. */
function finalItems(name: string): ActivityItem[] {
  if (name === 'streaming-text') return textItems(REASONING)
  if (name === 'reasoning-steps') return stepItems(STEPS.length, true)
  if (name === 'web-search') return searchItems(SEARCH_RESULTS.length)
  if (name === 'tool-calls') return TOOLS
  if (name === 'mixed-activity') return MIXED_FRAMES[MIXED_FRAMES.length - 1]
  return TRACE_ITEMS
}

onMounted(() => { reduce.value = matchMedia('(prefers-reduced-motion: reduce)').matches; mounted.value = true })
let frame = 0
watch([variant, run, mounted], (_, __, cleanup) => {
  if (!mounted.value) return
  const name = variant.value
  const timers: ReturnType<typeof setTimeout>[] = []
  const at = (ms: number, task: () => void) => timers.push(setTimeout(task, ms))
  cleanup(() => { timers.forEach(clearTimeout); cancelAnimationFrame(frame) })
  if (reduce.value) { items.value = finalItems(name); complete.value = true; return }
  complete.value = false
  if (name === 'streaming-text') {
    items.value = []
    const startedAt = performance.now()
    const stream = (now: number) => {
      const cursor = Math.min(REASONING.length, Math.floor(((now - startedAt) / 1000) * CHARACTERS_PER_SECOND))
      items.value = textItems(REASONING.slice(0, cursor))
      if (cursor === REASONING.length) at(500, () => { complete.value = true })
      else frame = requestAnimationFrame(stream)
    }
    frame = requestAnimationFrame(stream)
  } else if (name === 'reasoning-steps') {
    items.value = stepItems(1, false)
    STEPS.slice(1).forEach((_, index) => at(850 + index * 800, () => { items.value = stepItems(index + 2, false) }))
    at(3300, () => { items.value = stepItems(STEPS.length, true) })
    at(4200, () => { complete.value = true })
  } else if (name === 'web-search') {
    items.value = searchItems(0)
    SEARCH_RESULTS.forEach((_, index) => at(650 + index * 650, () => { items.value = searchItems(index + 1) }))
    at(3900, () => { complete.value = true })
  } else if (name === 'tool-calls') {
    items.value = []
    TOOLS.forEach((_, index) => at(550 + index * 850, () => { items.value = TOOLS.slice(0, index + 1) }))
    at(3600, () => { complete.value = true })
  } else if (name === 'mixed-activity') {
    items.value = MIXED_FRAMES[0]
    MIXED_FRAMES.slice(1).forEach((_, index) => at(850 + index * 1050, () => { items.value = MIXED_FRAMES[index + 1] }))
    at(850 + (MIXED_FRAMES.length - 2) * 1050 + 900, () => { complete.value = true })
  } else {
    items.value = []
    TRACE_ITEMS.forEach((_, index) => at(250 + index * 650, () => { items.value = TRACE_ITEMS.slice(0, index + 1) }))
    at(250 + TRACE_ITEMS.length * 650, () => { complete.value = true })
  }
}, { immediate: true })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <div :key="variant" style="position:relative;width:100%" :style="{ height: `${LAYOUT[variant].height}px`, maxWidth: LAYOUT[variant].width }" :data-example-variant="variant">
    <AgentActivity
      :key="`${variant}-${run}`" :items="items" :content-type="settings.contentType" :status="complete ? 'complete' : 'working'" :duration="settings.duration"
      :default-open="reduce" :collapse-on-complete="!reduce" :max-height="settings.maxHeight" :active-label="variant === 'agent-trace' ? 'Running the agent trace…' : undefined"
    >
      <template #result-icon="{ result }">
        <svg v-if="MARKS[result.id]" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path v-for="d in MARKS[result.id]" :key="d" :d="d" /></svg>
      </template>
    </AgentActivity>
    <button type="button" class="be-agent-replay" @click="run++"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Replay</button>
    <label v-if="!fixed" class="be-agent-variant">Example <select :value="variant" @change="choose(($event.target as HTMLSelectElement).value)"><option v-for="option in options" :key="option">{{ option }}</option></select></label>
  </div>
</template>

<script setup lang="ts">
import { ApprovalCard, type ApprovalAnswers, type ApprovalCardStatus, type ApprovalQuestion } from 'beui-vue'
import { computed, onBeforeUnmount, shallowRef, watch } from 'vue'
import { useAgentVariant } from '../.vitepress/use-agent-variant'

const props = defineProps<{ variant?: string }>()
const { variant, choose, options, fixed } = useAgentVariant(() => props.variant, {
  questions: 'agents/approval-card-question', review: 'agents/approval-card-review',
})
const QUESTIONS: ApprovalQuestion[] = [
  {
    id: 'scope',
    title: 'How focused should the first release be?',
    options: [
      { value: 'focused', label: 'A focused starter set', description: 'Ship a few polished pieces first.' },
      { value: 'broad', label: 'A broader collection', description: 'Cover more ground with lighter depth.' },
      { value: 'flagship', label: 'One flagship experience', description: 'Pour everything into a single showcase.' },
    ],
    allowCustom: true,
    customPlaceholder: 'Describe another scope…',
  },
  {
    id: 'checks',
    title: 'Which checks should block publishing?',
    description: 'Select every check the agent must pass before it can continue.',
    multiple: true,
    options: [{ value: 'types', label: 'Type safety' }, { value: 'accessibility', label: 'Accessibility' }, { value: 'registry', label: 'Registry validation' }],
  },
  { id: 'preserve', title: 'Anything the agent should preserve?', allowCustom: true, customPlaceholder: 'Add a final constraint…' },
]

const run = shallowRef(0)
const status = shallowRef<ApprovalCardStatus>('pending')
let timer: ReturnType<typeof setTimeout> | undefined
const isQuestions = computed(() => variant.value === 'questions')
function submit(_answers: ApprovalAnswers) {
  status.value = 'submitting'
  timer = setTimeout(() => { status.value = 'answered' }, 750)
}
function finish(next: ApprovalCardStatus) {
  status.value = 'submitting'
  timer = setTimeout(() => { status.value = next }, 700)
}
function replay() { clearTimeout(timer); status.value = 'pending'; run.value += 1 }
const reviewResult = computed(() => status.value === 'approved' ? 'Publishing was approved.' : status.value === 'changes-requested' ? 'The agent will wait for revision notes.' : 'Publishing was declined.')
watch(variant, replay)
onBeforeUnmount(() => clearTimeout(timer))
</script>
<template>
  <div class="demo" :class="{ review: !isQuestions }" :data-example-variant="variant">
    <ApprovalCard v-if="isQuestions" :key="`q-${run}`" :questions="QUESTIONS" :status="status" result="Three responses sent to the agent." @submit="submit" />
    <ApprovalCard v-else :key="`r-${run}`" title="Publish the component update?" description="The agent has prepared the release and is waiting for your decision." :status="status" :result="reviewResult" @approve="finish('approved')" @request-changes="finish('changes-requested')" @reject="finish('rejected')">
      <dl class="facts">
        <div class="fact"><dt>Release</dt><dd class="mono">approval-card</dd></div>
        <div class="fact"><dt>Checks</dt><dd>4 passed</dd></div>
        <div class="fact"><dt>Visibility</dt><dd>Public registry</dd></div>
      </dl>
    </ApprovalCard>
    <button type="button" class="replay" @click="replay"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Replay</button>
    <label v-if="!fixed" class="variant">Example <select :value="variant" @change="choose(($event.target as HTMLSelectElement).value)"><option v-for="option in options" :key="option">{{ option }}</option></select></label>
  </div>
</template>
<style scoped>
.demo { position: relative; width: 100%; max-width: 32rem; height: 470px; }
.demo.review { height: 360px; }
.facts { display: grid; gap: 0.25rem; margin: 0; font-size: 0.75rem; line-height: 1rem; }
.fact { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.25rem 0; }
.fact dt { margin: 0; color: var(--beui-muted-foreground); }
.fact dd { margin: 0; color: color-mix(in srgb, var(--beui-foreground) 80%, transparent); }
.fact dd.mono { font-family: var(--font-mono, ui-monospace, monospace); }
.replay { position: absolute; bottom: 0; left: 0; display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; border: 0; border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: 0.75rem; line-height: 1rem; font-weight: 500; cursor: pointer; outline: none; transition: color 0.15s, background-color 0.15s; }
.replay:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.replay:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.variant { position: absolute; right: 0; bottom: 0; display: inline-flex; align-items: center; gap: 0.375rem; color: var(--beui-muted-foreground); font-size: 0.75rem; }
.variant select { padding: 0.125rem 0.25rem; border: 1px solid var(--beui-border); border-radius: 0.375rem; background: var(--beui-background); color: var(--beui-foreground); font: inherit; }
</style>

<script lang="ts">
export const approvalCardMessages = {
  title: 'Approval required', approve: 'Approve', submit: 'Submit response', requestChanges: 'Request changes', reject: 'Reject', dismiss: 'Dismiss',
  previousQuestion: 'Previous question', nextQuestion: 'Next question', customPlaceholder: 'Add another response…',
  questionProgress: 'Question {current} of {total}', stepCount: '{current}/{total}',
  inputRequired: 'Input required', submitting: 'Submitting', approved: 'Approved', rejected: 'Rejected', changesRequested: 'Changes requested', answered: 'Response submitted',
}
export type ApprovalCardStatus = 'pending' | 'submitting' | 'approved' | 'rejected' | 'changes-requested' | 'answered'
</script>
<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, useId } from 'vue'
import ButtonBase from '../ButtonBase.vue'
import { easeOut, swapSpring } from '../core/motion'
import AgentIcon from './AgentIcon.vue'
import AgentReveal from './AgentReveal.vue'
import AgentRollText from './AgentRollText.vue'
import ApprovalChoice from './ApprovalChoice.vue'
import './agent-tokens.css'
import { useHasListener, useValue, type Labels, type Option } from './shared'

export type ApprovalAnswer = { selected: string[], custom?: string }
export type ApprovalAnswers = Record<string, ApprovalAnswer>
export type ApprovalQuestion = { id: string, title: string, description?: string, options?: Option[], multiple?: boolean, autoAdvance?: boolean, allowCustom?: boolean, customPlaceholder?: string }

const props = withDefaults(defineProps<{
  title?: string, description?: string, questions?: ApprovalQuestion[], answers?: ApprovalAnswers, defaultAnswers?: ApprovalAnswers, step?: number, defaultStep?: number,
  status?: ApprovalCardStatus, approveLabel?: string, submitLabel?: string, result?: string,
  labels?: Labels
}>(), { questions: () => [], defaultAnswers: () => ({}), defaultStep: 0, status: 'pending' })
const emit = defineEmits<{ 'update:answers': [value: ApprovalAnswers], answersChange: [value: ApprovalAnswers], 'update:step': [value: number], stepChange: [value: number], submit: [value: ApprovalAnswers], approve: [], reject: [], requestChanges: [], dismiss: [] }>()
defineSlots<{ default?(): unknown, title?(): unknown, description?(): unknown, approveLabel?(): unknown, submitLabel?(): unknown, result?(): unknown }>()
const reduce = useReducedMotion()
const uid = useId()
// Optional actions only show when a listener is bound, like upstream's optional callback props.
const hasReject = useHasListener('reject')
const hasRequestChanges = useHasListener('requestChanges')
const hasDismiss = useHasListener('dismiss')
const { value: answers, set: setAnswers } = useValue<ApprovalAnswers>(() => props.answers, props.defaultAnswers, value => { emit('update:answers', value); emit('answersChange', value) })
const steps = useValue(() => props.step, props.defaultStep, value => { emit('update:step', value); emit('stepChange', value) })

const t = (key: keyof typeof approvalCardMessages, values?: Record<string, string | number>) => (props.labels?.[key] ?? approvalCardMessages[key]).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ''))
const questionMode = computed(() => props.questions.length > 0)
const multipleQuestions = computed(() => props.questions.length > 1)
const step = computed(() => Math.min(Math.max(0, steps.value.value), Math.max(0, props.questions.length - 1)))
const question = computed(() => props.questions[step.value])
const last = computed(() => step.value === props.questions.length - 1)
const pending = computed(() => props.status === 'pending')
const busy = computed(() => props.status === 'submitting')
const interactive = computed(() => pending.value || busy.value)
const EMPTY: ApprovalAnswer = { selected: [], custom: '' }
const answer = computed(() => (question.value ? answers.value[question.value.id] : undefined) ?? EMPTY)
const ready = computed(() => answer.value.selected.length > 0 || Boolean(answer.value.custom?.trim()))
const displayTitle = computed(() => question.value?.title ?? props.title ?? t('title'))
const titleKey = computed(() => question.value?.id ?? props.status)
const statusKey = { pending: 'inputRequired', submitting: 'submitting', approved: 'approved', rejected: 'rejected', 'changes-requested': 'changesRequested', answered: 'answered' } as const
const statusLabel = computed(() => t(statusKey[props.status]))
const tone = computed(() => props.status === 'pending' || props.status === 'changes-requested' ? 'amber' : props.status === 'submitting' ? 'blue' : props.status === 'approved' || props.status === 'answered' ? 'green' : 'rose')
const iconTone = computed(() => props.status === 'approved' || props.status === 'answered' ? 'green' : props.status === 'rejected' ? 'rose' : props.status === 'changes-requested' ? 'amber' : 'muted')
const icon = computed(() => busy.value ? 'LoaderCircle' : interactive.value ? (questionMode.value ? 'CircleHelp' : 'MessageSquareText') : props.status === 'rejected' ? 'X' : 'Check')

let autoAdvance: ReturnType<typeof setTimeout> | undefined
function clearAutoAdvance() { clearTimeout(autoAdvance); autoAdvance = undefined }
onBeforeUnmount(clearAutoAdvance)
function goTo(next: number) { clearAutoAdvance(); steps.set(next) }
function update(next: ApprovalAnswer) {
  if (question.value) setAnswers({ ...answers.value, [question.value.id]: next })
}
function proceed() {
  if (!last.value) goTo(step.value + 1)
  else emit('submit', answers.value)
}
function queueAutoAdvance() {
  const current = question.value
  if (!current || current.multiple || current.autoAdvance === false || last.value || busy.value) return
  clearAutoAdvance()
  autoAdvance = setTimeout(() => goTo(step.value + 1), 240)
}
function toggle(option: Option, checked: boolean) {
  update({ ...answer.value, selected: checked ? [...answer.value.selected, option.value] : answer.value.selected.filter(value => value !== option.value) })
}
function choose(value: string | undefined) {
  if (value === undefined) return
  update({ selected: [value], custom: '' })
  queueAutoAdvance()
}
const progressDots = computed(() => props.questions.map((item, index) => ({ id: item.id, index })))
const dotState = (index: number) => ({ scale: reduce.value || index === step.value ? 1 : 0.75, opacity: index <= step.value ? 1 : 0.35 })
</script>
<template>
  <div class="be-ag be-ac" :data-state="status" :aria-busy="busy">
    <div class="be-ac-row">
      <span aria-hidden="true" class="be-ac-icon" :data-tone="iconTone"><AgentIcon :name="icon" :size="16" :class="{ 'be-ag-spin': busy && !reduce }" /></span>
      <div class="be-ac-main">
        <div class="be-ac-head">
          <h3 class="be-ac-title"><AgentRollText :value="titleKey"><slot name="title">{{ displayTitle }}</slot></AgentRollText></h3>
          <template v-if="questionMode && interactive"><span v-if="multipleQuestions" class="be-ac-step">{{ t('stepCount', { current: step + 1, total: questions.length }) }}</span></template>
          <span v-else class="be-ac-badge" :data-tone="tone">{{ statusLabel }}</span>
          <button v-if="hasDismiss()" type="button" class="be-ac-dismiss" :aria-label="t('dismiss')" @click="emit('dismiss')"><AgentIcon name="X" :size="16" /></button>
        </div>
        <AgentReveal :open="interactive">
          <AnimatePresence v-if="questionMode && question" :initial="false" mode="wait">
            <motion.div :key="question.id" :initial="reduce ? { opacity: 1 } : { opacity: 0, x: 8 }" :animate="{ opacity: 1, x: 0 }" :exit="reduce ? { opacity: 0 } : { opacity: 0, x: -6 }" :transition="{ duration: reduce ? 0 : 0.2, ease: easeOut }">
              <p v-if="question.description" class="be-ac-desc">{{ question.description }}</p>
              <div class="be-ac-options">
                <template v-if="question.options?.length">
                  <div v-if="question.multiple" class="be-ac-list"><ApprovalChoice v-for="option in question.options" :key="option.value" type="checkbox" :group="`${uid}-${question.id}`" :checked="answer.selected.includes(option.value)" :disabled="busy || option.disabled" :label="option.label" :description="option.description" @change="toggle(option, $event)" /></div>
                  <div v-else role="radiogroup" :aria-label="displayTitle" class="be-ac-list"><ApprovalChoice v-for="option in question.options" :key="option.value" type="radio" :group="`${uid}-${question.id}`" :name="`${uid}-${question.id}`" :value="option.value" :checked="answer.selected[0] === option.value" :disabled="busy || option.disabled" :label="option.label" :description="option.description" @change="choose(option.value)" /></div>
                </template>
                <div v-if="question.allowCustom" class="be-ac-custom" :class="{ 'be-ac-custom-gap': question.options?.length }"><div class="be-ac-field"><input class="be-ac-input" type="text" :value="answer.custom ?? ''" :disabled="busy" :placeholder="question.customPlaceholder ?? t('customPlaceholder')" :aria-label="question.customPlaceholder ?? t('customPlaceholder')" @input="update({ selected: question.multiple ? answer.selected : [], custom: ($event.target as HTMLInputElement).value })" /></div></div>
              </div>
            </motion.div>
          </AnimatePresence>
          <div v-else>
            <p v-if="description || $slots.description" class="be-ac-desc"><slot name="description">{{ description }}</slot></p>
            <div v-if="$slots.default" class="be-ac-children"><slot /></div>
          </div>
          <div v-if="questionMode" class="be-ac-footer">
            <template v-if="multipleQuestions">
              <ButtonBase variant="ghost" size="icon" class="be-ac-round" :aria-label="t('previousQuestion')" :disabled="busy || step === 0" @click="goTo(step - 1)"><AgentIcon name="ArrowLeft" :size="16" /></ButtonBase>
              <span class="be-ac-dots"><span class="be-ag-sr">{{ t('questionProgress', { current: step + 1, total: questions.length }) }}</span><motion.span v-for="dot in progressDots" :key="dot.id" aria-hidden="true" class="be-ac-dot" :initial="dotState(dot.index)" :animate="dotState(dot.index)" :transition="swapSpring" /></span>
            </template>
            <ButtonBase :size="last ? 'sm' : 'icon'" class="be-ac-round be-ac-next" :aria-label="last ? t('submit') : t('nextQuestion')" :disabled="busy || !ready" @click="proceed">
              <AgentIcon v-if="busy" name="LoaderCircle" :size="16" :class="{ 'be-ag-spin': !reduce }" />
              <template v-else-if="last"><slot name="submitLabel">{{ submitLabel ?? t('submit') }}</slot><AgentIcon name="ArrowRight" :size="14" /></template>
              <AgentIcon v-else name="ArrowRight" :size="16" />
            </ButtonBase>
          </div>
          <div v-else class="be-ac-actions">
            <ButtonBase size="sm" class="be-ac-round" :disabled="busy" @click="emit('approve')"><slot name="approveLabel">{{ approveLabel ?? t('approve') }}</slot></ButtonBase>
            <ButtonBase v-if="hasRequestChanges()" variant="secondary" size="sm" class="be-ac-round" :disabled="busy" @click="emit('requestChanges')">{{ t('requestChanges') }}</ButtonBase>
            <ButtonBase v-if="hasReject()" variant="ghost" size="sm" class="be-ac-round be-ac-reject" :disabled="busy" @click="emit('reject')">{{ t('reject') }}</ButtonBase>
          </div>
        </AgentReveal>
        <p v-if="!interactive" class="be-ac-result"><slot name="result">{{ result ?? statusLabel }}</slot></p>
      </div>
    </div>
  </div>
</template>
<style scoped>
.be-ac { box-sizing: border-box; width: 100%; overflow: hidden; border-radius: 1rem; background: var(--beui-muted); padding: 1rem; font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.be-ac-row { display: flex; align-items: flex-start; gap: 0.75rem; }
.be-ac-icon { display: grid; flex: none; width: 1.25rem; height: 1.25rem; place-items: center; color: var(--beui-muted-foreground); }
.be-ac-icon[data-tone=green] { color: var(--ag-green); }
.be-ac-icon[data-tone=rose] { color: var(--ag-rose); }
.be-ac-icon[data-tone=amber] { color: var(--ag-amber); }
.be-ac-main { min-width: 0; flex: 1; }
.be-ac-head { display: flex; min-width: 0; align-items: flex-start; gap: 0.75rem; }
.be-ac-title { min-width: 0; flex: 1; margin: 0; padding: 0; border: 0; letter-spacing: normal; font-size: 1rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.be-ac-step { flex: none; font-size: 0.75rem; line-height: 1rem; font-variant-numeric: tabular-nums; color: color-mix(in srgb, var(--beui-muted-foreground) 65%, transparent); }
.be-ac-badge { flex: none; border: 1px solid; border-radius: 9999px; padding: 0.125rem 0.5rem; font-size: 11px; line-height: calc(1.25 / .875); font-weight: 500; transition: color 0.15s, background-color 0.15s, border-color 0.15s; }
.be-ac-badge[data-tone=amber] { border-color: color-mix(in srgb, var(--ag-amber-500) 30%, transparent); background: color-mix(in srgb, var(--ag-amber-500) 10%, transparent); color: var(--ag-amber); }
.be-ac-badge[data-tone=blue] { border-color: color-mix(in srgb, var(--ag-blue-500) 30%, transparent); background: color-mix(in srgb, var(--ag-blue-500) 10%, transparent); color: var(--ag-blue); }
.be-ac-badge[data-tone=green] { border-color: color-mix(in srgb, var(--ag-green-500) 30%, transparent); background: color-mix(in srgb, var(--ag-green-500) 10%, transparent); color: var(--ag-green); }
.be-ac-badge[data-tone=rose] { border-color: color-mix(in srgb, var(--ag-rose-500) 30%, transparent); background: color-mix(in srgb, var(--ag-rose-500) 10%, transparent); color: var(--ag-rose); }
.be-ac-dismiss { display: grid; flex: none; width: 1.25rem; height: 1.25rem; place-items: center; padding: 0; border: 0; border-radius: 9999px; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color 0.15s; }
.be-ac-dismiss:hover { color: var(--beui-foreground); }
.be-ac-dismiss:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-ac-desc { margin: 0.25rem 0 0; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.be-ac-children { margin-top: 0.75rem; }
.be-ac-options { margin-top: 0.75rem; }
.be-ac-list { display: grid; gap: 0.125rem; }
.be-ac-custom { padding: 0.125rem; }
.be-ac-custom-gap { margin-top: 0.375rem; }
.be-ac-field { position: relative; box-sizing: border-box; height: 2.5rem; overflow: hidden; border-radius: 0.75rem; background: color-mix(in srgb, var(--beui-background) 70%, transparent); transition: background-color 0.2s, box-shadow 0.2s; }
.be-ac-field:focus-within { background: var(--beui-background); box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-ring) 40%, transparent); }
.be-ac-field:has(:disabled) { opacity: 0.6; }
.be-ac-input { box-sizing: border-box; width: 100%; height: 100%; padding: 0 0.75rem; border: 0; background: transparent; color: var(--beui-foreground); caret-color: var(--beui-foreground); font: inherit; font-size: 0.875rem; line-height: 1.5rem; outline: none; }
.be-ac-input::placeholder { color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); }
.be-ac-input:disabled { cursor: not-allowed; }
.be-ac-footer { display: flex; align-items: center; gap: 0.75rem; margin-top: 1rem; }
.be-ac-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-top: 1rem; }
.be-ac-dots { display: flex; gap: 0.375rem; }
.be-ac-dot { width: 0.375rem; height: 0.375rem; border-radius: 9999px; background: var(--beui-foreground); }
.be-ac-next { margin-inline-start: auto; }
.be-ac :deep(.be-button.be-ac-round) { border-radius: 9999px; }
.be-ac :deep(.be-button.be-ac-reject:hover) { color: var(--ag-rose); }
.be-ac-result { margin: 0.25rem 0 0; font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
</style>

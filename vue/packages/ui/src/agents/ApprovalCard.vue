<script setup lang="ts">
import { computed, useId } from 'vue'
import { useValue, type Labels, type Option } from './shared'
export type ApprovalAnswer = { selected: string[], custom?: string }
export type ApprovalAnswers = Record<string, ApprovalAnswer>
export type ApprovalQuestion = { id: string, title: string, description?: string, options?: Option[], multiple?: boolean, autoAdvance?: boolean, allowCustom?: boolean, customPlaceholder?: string }
const props = withDefaults(defineProps<{
  title?: string, description?: string, questions?: ApprovalQuestion[], answers?: ApprovalAnswers, defaultAnswers?: ApprovalAnswers, step?: number, defaultStep?: number,
  status?: 'pending' | 'submitting' | 'approved' | 'rejected' | 'changes-requested' | 'answered', approveLabel?: string, submitLabel?: string, result?: string,
  labels?: Labels, onRequestChanges?: () => void, onDismiss?: () => void
}>(), { questions: () => [], defaultAnswers: () => ({}), defaultStep: 0, status: 'pending' })
const emit = defineEmits<{ 'update:answers': [value: ApprovalAnswers], answersChange: [value: ApprovalAnswers], 'update:step': [value: number], stepChange: [value: number], submit: [value: ApprovalAnswers], approve: [], reject: [] }>()
const { value: answers, set: setAnswers } = useValue<ApprovalAnswers>(() => props.answers, props.defaultAnswers, value => { emit('update:answers', value); emit('answersChange', value) })
const steps = useValue(() => props.step, props.defaultStep, value => { emit('update:step', value); emit('stepChange', value) })
const step = computed(() => Math.max(0, Math.min(steps.value.value, props.questions.length - 1)))
const question = computed(() => props.questions[step.value])
const blank = { selected: [] as string[], custom: '' }
const answer = computed(() => answers.value[question.value?.id] ?? blank)
const ready = computed(() => Boolean(answer.value.selected.length || answer.value.custom?.trim()))
const id = useId()
function select(option: Option) {
  if (option.disabled || props.status !== 'pending') return
  const current: string[] = answer.value.selected
  const next = question.value.multiple ? (current.includes(option.value) ? current.filter(value => value !== option.value) : [...current, option.value]) : [option.value]
  setAnswers({ ...answers.value, [question.value.id]: { ...answer.value, selected: next } })
  if (question.value.autoAdvance && !question.value.multiple && step.value + 1 < props.questions.length) steps.set(step.value + 1)
}
function advance() {
  if (!ready.value || props.status !== 'pending') return
  if (step.value + 1 < props.questions.length) steps.set(step.value + 1)
  else emit('submit', answers.value)
}
</script>
<template>
  <section class="be-agent-box be-agent-body be-approval" :aria-label="title ?? 'Approval'">
    <strong>{{ title ?? (question ? 'A question for you' : 'Review request') }}</strong><p v-if="description" class="be-agent-muted">{{ description }}</p>
    <template v-if="status === 'pending' || status === 'submitting'">
      <slot />
      <fieldset v-if="question" :disabled="status === 'submitting'"><legend>{{ question.title }}</legend><p v-if="question.description">{{ question.description }}</p>
        <label v-for="option in question.options" :key="option.value"><input :type="question.multiple ? 'checkbox' : 'radio'" :name="`${id}-${question.id}`" :checked="answer.selected.includes(option.value)" :disabled="option.disabled" @change="select(option)" /><span>{{ option.label }}<small v-if="option.description">{{ option.description }}</small></span></label>
        <textarea v-if="question.allowCustom || !question.options?.length" :aria-label="question.customPlaceholder ?? 'Your answer'" :placeholder="question.customPlaceholder" :value="answer.custom ?? ''" @input="setAnswers({ ...answers, [question.id]: { ...answer, custom: ($event.target as HTMLTextAreaElement).value } })" />
      </fieldset>
      <div class="be-agent-actions" v-if="question"><button v-if="step > 0" class="be-agent-button" type="button" @click="steps.set(step - 1)">{{ labels?.back ?? 'Back' }}</button><span class="be-agent-muted">{{ step + 1 }} / {{ questions.length }}</span><button class="be-agent-button be-agent-solid be-agent-end" type="button" :disabled="!ready || status === 'submitting'" @click="advance">{{ step + 1 < questions.length ? (labels?.next ?? 'Next') : (submitLabel ?? labels?.submit ?? 'Submit') }}</button></div>
      <div v-else class="be-agent-actions"><button class="be-agent-button be-agent-solid" type="button" :disabled="status === 'submitting'" @click="emit('approve')">{{ approveLabel ?? labels?.approve ?? 'Approve' }}</button><button v-if="onRequestChanges" class="be-agent-button" type="button" :disabled="status === 'submitting'" @click="onRequestChanges">{{ labels?.requestChanges ?? 'Request changes' }}</button><button class="be-agent-button" type="button" :disabled="status === 'submitting'" @click="emit('reject')">{{ labels?.reject ?? 'Reject' }}</button></div>
    </template>
    <div v-else role="status"><slot name="result">{{ result ?? labels?.[status] ?? status }}</slot><button v-if="onDismiss" type="button" class="be-agent-button" @click="onDismiss">{{ labels?.dismiss ?? 'Dismiss' }}</button></div>
  </section>
</template>
<style scoped>.be-approval{display:grid;gap:.75rem}.be-approval p{margin:0}.be-approval fieldset{border:0;padding:0;min-width:0}.be-approval legend{font-weight:600;margin-bottom:.5rem}.be-approval label{display:flex;align-items:start;gap:.65rem;padding:.5rem;border-radius:.5rem}.be-approval label:has(:checked){background:var(--beui-muted)}.be-approval small{display:block;color:var(--beui-muted-foreground)}.be-approval textarea{width:100%;padding:.5rem;background:var(--beui-muted);border-radius:.5rem}</style>

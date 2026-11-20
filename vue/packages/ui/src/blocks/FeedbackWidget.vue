<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useId } from 'vue'
import type { Labels } from '../agents/shared'
const props = defineProps<{ onSubmit?: (data: { message:string }) => void | Promise<void>, position?: 'bottom-right' | 'bottom-left', title?: string, placeholder?: string, labels?: Labels }>()
const state = shallowRef<'idle' | 'open' | 'sending' | 'sent' | 'error'>('idle')
const message = shallowRef('')
const input = shallowRef<HTMLTextAreaElement | null>(null)
const trigger = shallowRef<HTMLButtonElement | null>(null)
const id = useId()
let timer: ReturnType<typeof setTimeout> | undefined
let generation = 0
async function open() { state.value = 'open'; await nextTick(); input.value?.focus() }
async function close() { generation++; clearTimeout(timer); state.value = 'idle'; message.value = ''; await nextTick(); trigger.value?.focus() }
async function submit() {
  if (!message.value.trim() || state.value === 'sending') return
  const current = ++generation
  state.value = 'sending'
  try {
    await props.onSubmit?.({message:message.value.trim()})
    if (current !== generation) return
    state.value = 'sent'; timer = setTimeout(close, 1600)
  } catch { if (current === generation) state.value = 'error' }
}
onBeforeUnmount(() => { generation++; clearTimeout(timer) })
</script>
<template>
  <div class="be-block be-feedback" :data-position="position ?? 'bottom-right'">
    <button v-if="state === 'idle'" ref="trigger" type="button" class="be-block-button be-block-primary" aria-haspopup="dialog" @click="open"><slot name="icon" />{{ labels?.trigger ?? 'Feedback' }}</button>
    <form v-else class="be-block-panel be-block-stack" role="dialog" :aria-labelledby="id" @submit.prevent="submit" @keydown.esc="close"><div class="be-block-row"><strong :id="id">{{ title ?? labels?.title ?? 'Send feedback' }}</strong><button type="button" class="be-block-button be-block-end" aria-label="Close feedback" @click="close">×</button></div>
      <output v-if="state === 'sent'" role="status">{{ labels?.success ?? 'Thanks for your feedback!' }}</output><template v-else><textarea ref="input" v-model="message" class="be-block-field" :placeholder="placeholder ?? 'What can we improve?'" aria-label="Feedback message" :disabled="state === 'sending'" /><span v-if="state === 'error'" role="alert">{{ labels?.error ?? 'Could not send feedback. Try again.' }}</span><button type="submit" class="be-block-button be-block-primary" :disabled="!message.trim() || state === 'sending'">{{ state === 'sending' ? 'Sending…' : (labels?.submit ?? 'Send feedback') }}</button></template>
    </form>
  </div>
</template>
<style scoped>.be-feedback{display:flex;align-items:flex-end;justify-content:flex-end}.be-feedback[data-position=bottom-left]{justify-content:flex-start}.be-feedback form{width:min(100%,19rem);animation:be-feedback-open .24s ease-out;transform-origin:bottom right}.be-feedback textarea{min-height:5rem;resize:vertical}@keyframes be-feedback-open{from{opacity:0;transform:scale(.97) translateY(8px)}}@media(prefers-reduced-motion:reduce){.be-feedback form{animation:none}}</style>

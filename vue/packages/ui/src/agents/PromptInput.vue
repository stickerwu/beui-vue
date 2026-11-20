<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, watch } from 'vue'
import { useValue, type Labels, type Option } from './shared'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  modelValue?: string, value?: string, defaultValue?: string, models?: Option[], model?: string, defaultModel?: string,
  actions?: Option[], loading?: boolean, disabled?: boolean, minRows?: number, maxRows?: number, labels?: Labels, placeholder?: string, ariaLabel?: string
}>(), { defaultValue: '', models: () => [], actions: () => [], minRows: 2, maxRows: 8 })
const emit = defineEmits<{
  'update:modelValue': [value: string], valueChange: [value: string], 'update:model': [value: string], modelChange: [value: string],
  submit: [value: string, model?: string], stop: [], action: [value: string], keydown: [event: KeyboardEvent]
}>()
const { value, set } = useValue(() => props.modelValue ?? props.value, props.defaultValue, next => { emit('update:modelValue', next); emit('valueChange', next) })
const selected = useValue(() => props.model, props.defaultModel ?? props.models[0]?.value, next => { emit('update:model', next); emit('modelChange', next) })
const currentModel = selected.value
const textarea = shallowRef<HTMLTextAreaElement | null>(null)
const mirror = shallowRef<HTMLElement | null>(null)
const add = shallowRef<HTMLButtonElement | null>(null)
const form = shallowRef<HTMLFormElement | null>(null)
const actionsOpen = shallowRef(false)
const id = useId()
const canSend = computed(() => value.value.trim() && !props.disabled && !props.loading)
let observer: ResizeObserver | undefined
function size() {
  if (textarea.value && mirror.value) textarea.value.style.height = `${Math.min(Math.max(mirror.value.scrollHeight, props.minRows * 24), Math.max(props.minRows, props.maxRows) * 24)}px`
}
function send() {
  if (!canSend.value) return
  emit('submit', value.value.trim(), currentModel.value)
  if (props.modelValue === undefined && props.value === undefined) set('')
  textarea.value?.focus({ preventScroll: true })
}
function keydown(event: KeyboardEvent) {
  emit('keydown', event)
  if (event.defaultPrevented || event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  send()
}
function closeActions() { actionsOpen.value = false; add.value?.focus() }
function outside(event: PointerEvent) { if (!form.value?.contains(event.target as Node)) actionsOpen.value = false }
watch([value, () => props.minRows, () => props.maxRows], size, { flush: 'post' })
onMounted(() => {
  observer = new ResizeObserver(size)
  if (mirror.value) observer.observe(mirror.value)
  document.addEventListener('pointerdown', outside)
  nextTick(size)
})
onBeforeUnmount(() => { observer?.disconnect(); document.removeEventListener('pointerdown', outside) })
</script>
<template>
  <form ref="form" class="be-agent-box be-prompt" :class="$attrs.class" @submit.prevent="send">
    <div ref="mirror" class="be-prompt-measure" aria-hidden="true">{{ value }}&#8203;</div>
    <textarea ref="textarea" v-bind="{ ...$attrs, class: undefined }" :aria-label="ariaLabel ?? labels?.label ?? 'Prompt'" :placeholder="placeholder ?? labels?.placeholder ?? 'Ask the agent to do something…'"
      :value="value" :disabled="disabled" :rows="minRows" @input="set(($event.target as HTMLTextAreaElement).value)" @keydown="keydown" />
    <div class="be-agent-row">
      <button v-if="actions.length" ref="add" type="button" class="be-agent-button" :disabled="disabled || loading" :aria-label="labels?.addToPrompt ?? 'Add to prompt'" :aria-expanded="actionsOpen" :aria-controls="id" @click="actionsOpen = !actionsOpen" @keydown.esc="closeActions">＋</button>
      <div v-if="actionsOpen" :id="id" class="be-prompt-actions" @keydown.esc.stop="closeActions">
        <button v-for="action in actions" :key="action.value" type="button" class="be-agent-button" :disabled="action.disabled" @click="emit('action', action.value); closeActions()"><span>{{ action.label }}</span><small v-if="action.description">{{ action.description }}</small></button>
      </div>
      <slot name="leading-action" />
      <select v-if="models.length" :value="currentModel" :disabled="disabled || loading" :aria-label="labels?.chooseModel ?? 'Choose model'" @change="selected.set(($event.target as HTMLSelectElement).value)"><option v-for="option in models" :key="option.value" :value="option.value" :disabled="option.disabled">{{ option.label }}</option></select>
      <button v-if="loading" type="button" class="be-agent-button be-agent-solid be-agent-end" :aria-label="labels?.stop ?? 'Stop generating'" :disabled="disabled" @click="emit('stop')">■</button>
      <button v-else type="submit" class="be-agent-button be-agent-solid be-agent-end" :aria-label="labels?.send ?? 'Send prompt'" :disabled="!canSend">↑</button>
    </div>
  </form>
</template>
<style scoped>
.be-prompt { position:relative; padding:.5rem; }.be-prompt:focus-within { border-color:color-mix(in srgb,var(--beui-foreground) 25%,transparent); }
.be-prompt textarea,.be-prompt-measure { box-sizing:border-box; width:100%; padding:.375rem .5rem; font:inherit; line-height:24px; overflow-wrap:break-word; }
.be-prompt textarea { display:block; resize:none; background:transparent; color:inherit; border:none; outline:0; }.be-prompt textarea:focus-visible { outline:none; }
.be-prompt-measure { visibility:hidden; pointer-events:none; position:absolute; inset-inline:.5rem; width:auto; white-space:pre-wrap; }
.be-prompt select { color:inherit; font:inherit; background:var(--beui-background); border:0; }.be-prompt-actions { position:absolute; left:0; bottom:2.75rem; z-index:2; display:grid; width:14rem; padding:.375rem; background:var(--beui-background); border:1px solid var(--beui-border); border-radius:.75rem; box-shadow:0 .25rem 1rem #0002; }
.be-prompt-actions button { align-items:start; flex-direction:column; }.be-prompt-actions small { color:var(--beui-muted-foreground); }.be-prompt button[type=submit],.be-prompt .be-agent-end { border-radius:50%; width:2rem; height:2rem; }
</style>

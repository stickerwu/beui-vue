<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { useValue, type Labels } from '../agents/shared'

const props = withDefaults(defineProps<{
  length?: number, modelValue?: string, value?: string, defaultValue?: string, label?: string,
  hint?: string, successMessage?: string, errorMessage?: string, status?: 'idle' | 'success' | 'error',
  mask?: boolean, disabled?: boolean, autoFocus?: boolean, labels?: Labels
}>(), { length: 6, defaultValue: '', status: 'idle' })
const emit = defineEmits<{ 'update:modelValue': [value: string], change: [value: string], complete: [value: string] }>()
const id = useId()
const length = computed(() => Math.max(1, Math.floor(props.length)))
const { value, set } = useValue(() => props.modelValue ?? props.value, props.defaultValue, next => {
  emit('update:modelValue', next)
  emit('change', next)
})
const digits = computed(() => value.value.replace(/\D/g, '').slice(0, length.value))
const position = shallowRef(0)
function update(input: HTMLInputElement) {
  const before = digits.value
  const next = input.value.replace(/\D/g, '').slice(0, length.value)
  input.value = next
  position.value = input.selectionStart ?? next.length
  set(next)
  if (next.length === length.value && next !== before) emit('complete', next)
}
</script>
<template>
  <div class="be-block be-block-stack be-otp" :data-status="status">
    <label v-if="label" :for="id">{{ label }}</label>
    <div class="be-otp-entry">
      <input :id="id" :value="digits" :type="mask ? 'password' : 'text'" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" :aria-label="label ?? labels?.label ?? 'One-time passcode'"
        :aria-describedby="`${id}-hint`" :aria-invalid="status === 'error'" :disabled="disabled" :autofocus="autoFocus"
        @input="update($event.target as HTMLInputElement)" @select="position = ($event.target as HTMLInputElement).selectionStart ?? 0" />
      <span v-for="index in length" :key="index" aria-hidden="true" :data-cursor="Math.min(position, length - 1) === index - 1 || undefined">{{ mask && digits[index - 1] ? '•' : digits[index - 1] }}</span>
    </div>
    <span :id="`${id}-hint`" role="status" class="be-block-muted">{{ status === 'success' ? (successMessage ?? labels?.verified ?? 'Verified') : status === 'error' ? errorMessage : hint }}</span>
  </div>
</template>
<style scoped>
.be-otp-entry { display:flex; gap:.375rem; position:relative; width:max-content; max-width:100%; }
.be-otp-entry input { position:absolute; inset:0; z-index:1; width:100%; height:100%; opacity:0; }
.be-otp-entry span { box-sizing:border-box; display:grid; place-items:center; width:clamp(1.65rem,7vw,2.75rem); height:3rem; border:1px solid var(--beui-border); border-radius:.65rem; background:var(--beui-background); font:600 1.25rem ui-monospace,monospace; }
.be-otp-entry:focus-within span[data-cursor] { outline:2px solid var(--beui-ring); }
.be-otp[data-status=error] .be-otp-entry { animation:be-otp-shake .22s ease-out; }
.be-otp[data-status=success] .be-otp-entry span { border-color:#438861; }
@keyframes be-otp-shake { 30% { transform:translateX(-3px) } 70% { transform:translateX(3px) } }
@media(prefers-reduced-motion:reduce){.be-otp[data-status=error] .be-otp-entry {animation:none}}
</style>

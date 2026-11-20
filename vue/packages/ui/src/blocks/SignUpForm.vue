<script setup lang="ts">
import { computed, nextTick, reactive, shallowRef, useId } from 'vue'
import { useValue, type Labels } from '../agents/shared'
export type SignUpValues = { name: string, email: string, password: string, confirmPassword: string, terms: boolean }
type Errors = Partial<Record<keyof SignUpValues, string>>
type Status = 'idle' | 'loading' | 'success' | 'error'
const props = withDefaults(defineProps<{
  values?: SignUpValues, defaultValues?: Partial<SignUpValues>, onSubmit?: (values: SignUpValues) => void | Promise<void>, validate?: (values: SignUpValues) => Errors,
  status?: Status, errorMessage?: string, title?: string, description?: string, submitLabel?: string, strengthMeter?: boolean, labels?: Labels
}>(), { strengthMeter: true })
const emit = defineEmits<{ 'update:values': [value: SignUpValues], valuesChange: [value: SignUpValues] }>()
const seed = { name:'', email:'', password:'', confirmPassword:'', terms:false, ...props.defaultValues }
const { value, set } = useValue<SignUpValues>(() => props.values, seed, next => { emit('update:values',next); emit('valuesChange',next) })
const local = shallowRef<Status>('idle')
const status = computed(() => props.status ?? local.value)
const errors = shallowRef<Errors>({})
const shown = reactive({ password:false, confirmPassword:false })
const id = useId()
const fields = [{ key:'name', label:'Name', auto:'name' },{ key:'email', label:'Email', auto:'email' },{ key:'password', label:'Password', auto:'new-password' },{ key:'confirmPassword', label:'Confirm password', auto:'new-password' }] as const
function validate(current: SignUpValues): Errors {
  if (props.validate) return props.validate(current)
  const next: Errors = {}
  if (!current.name.trim()) next.name = 'Enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email)) next.email = 'Enter a valid email address.'
  if (current.password.length < 8) next.password = 'Use at least 8 characters.'
  if (!current.confirmPassword || current.password !== current.confirmPassword) next.confirmPassword = 'Passwords must match.'
  if (!current.terms) next.terms = 'Accept the terms to continue.'
  return next
}
function update(key: keyof SignUpValues, next: string | boolean) {
  const changed = { ...value.value, [key]:next }
  set(changed)
  if (errors.value[key]) errors.value = { ...errors.value, [key]:validate(changed)[key] }
}
async function submit() {
  if (status.value === 'loading') return
  errors.value = validate(value.value)
  const first = Object.keys(errors.value).find(key => errors.value[key as keyof SignUpValues])
  if (first) { await nextTick(); document.getElementById(`${id}-${first}`)?.focus(); return }
  local.value = 'loading'
  try { await props.onSubmit?.({ ...value.value }); local.value = 'success' }
  catch { local.value = 'error' }
}
const strength = computed(() => Math.min(4, Math.floor(value.value.password.length / 4)))
</script>
<template>
  <form class="be-block be-block-panel be-block-stack" novalidate @submit.prevent="submit">
    <div><strong>{{ title ?? labels?.title ?? 'Create your account' }}</strong><div class="be-block-muted">{{ description ?? labels?.description ?? 'Start building in under a minute.' }}</div></div>
    <div v-for="field in fields" :key="field.key"><label :for="`${id}-${field.key}`">{{ labels?.[`${field.key}Label`] ?? field.label }}</label>
      <div class="be-block-row"><input :id="`${id}-${field.key}`" class="be-block-field" :name="field.key" :autocomplete="field.auto" :type="field.key === 'email' ? 'email' : field.key === 'name' || shown[field.key] ? 'text' : 'password'"
        :value="value[field.key]" :aria-invalid="!!errors[field.key]" :aria-describedby="errors[field.key] ? `${id}-${field.key}-error` : undefined" @input="update(field.key, ($event.target as HTMLInputElement).value)" />
        <button v-if="field.key === 'password' || field.key === 'confirmPassword'" type="button" class="be-block-button" :aria-label="`${shown[field.key] ? 'Hide' : 'Show'} ${field.label.toLowerCase()}`" @click="shown[field.key] = !shown[field.key]">{{ shown[field.key] ? '◉' : '◎' }}</button>
      </div><small v-if="errors[field.key]" :id="`${id}-${field.key}-error`" class="be-block-error">{{ errors[field.key] }}</small>
      <meter v-if="strengthMeter && field.key === 'password' && value.password" min="0" max="4" :value="strength" aria-label="Password strength" />
    </div>
    <label><input :id="`${id}-terms`" type="checkbox" :checked="value.terms" :aria-invalid="!!errors.terms" @change="update('terms', ($event.target as HTMLInputElement).checked)" /> {{ labels?.terms ?? 'I agree to the Terms and Privacy Policy' }}</label>
    <small v-if="errors.terms" class="be-block-error">{{ errors.terms }}</small><span v-if="status === 'error'" role="alert">{{ errorMessage ?? 'Could not create account. Try again.' }}</span>
    <button type="submit" class="be-block-button be-block-primary" :disabled="status === 'loading'">{{ status === 'loading' ? 'Creating account' : status === 'success' ? 'Account created' : (submitLabel ?? labels?.submit ?? 'Create account') }}</button><slot name="footer" />
  </form>
</template>
<style scoped>.be-block-row{flex-wrap:nowrap}.be-block-field{flex:1}.be-block-panel{max-width:24rem}label{display:block;font-weight:500;margin-bottom:.2rem}meter{width:100%;height:.3rem}</style>

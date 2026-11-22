<script lang="ts">
export type SignUpStatus = 'idle' | 'loading' | 'success' | 'error'
export type SignUpValues = { name: string, email: string, password: string, confirmPassword: string, terms: boolean }
export type SignUpErrors = Partial<Record<keyof SignUpValues, string>>
export type SignUpFormClassNames = { root?: string, header?: string, title?: string, description?: string, fields?: string, strength?: string, terms?: string, submit?: string, footer?: string }

const MIN_PASSWORD_LENGTH = 8

/**
 * Length-weighted strength score, 0-4. NIST SP 800-63B advises against composition requirements and
 * treats length as the dominant factor, so extra character classes only nudge the score; they can't
 * rescue a short password. A heuristic for feedback, not entropy estimation.
 */
export function passwordStrength(password: string): number {
  if (password.length < MIN_PASSWORD_LENGTH) return 0
  let score = 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(pattern => pattern.test(password)).length
  if (classes >= 3) score += 1
  return Math.min(score, 4)
}
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, h, shallowRef, useId, useSlots } from 'vue'
import StatefulButton from '../actions/StatefulButton.vue'
import { useValue } from '../agents/shared'
import Checkbox from '../controls/Checkbox.vue'
import Input from '../controls/Input.vue'
import { easeOut, layoutSpring } from '../core/motion'
import { formatMessage, signUpFormMessages } from './messages'

const props = withDefaults(defineProps<{
  /** Controlled values. Omit for uncontrolled. */
  values?: SignUpValues
  defaultValues?: Partial<SignUpValues>
  /** Called with valid values only. Return a promise to drive the button state. */
  onSubmit?: (values: SignUpValues) => void | Promise<void>
  /** Replace the built-in rules: return a message per invalid field. */
  validate?: (values: SignUpValues) => SignUpErrors
  /** Controlled submit state. Omit to let the form track it. */
  status?: SignUpStatus
  /** Form-level failure message, shown above the submit button. */
  errorMessage?: string
  /** `null` hides the header text; only an omitted prop falls back to the default. */
  title?: string | null
  description?: string | null
  submitLabel?: string
  /** Show the password strength meter. */
  strengthMeter?: boolean
  labels?: Partial<typeof signUpFormMessages>
  className?: string
  classNames?: SignUpFormClassNames
}>(), { strengthMeter: true, title: undefined, description: undefined })
const emit = defineEmits<{ 'update:values': [value: SignUpValues], valuesChange: [value: SignUpValues] }>()
defineSlots<{
  /** Replaces the heading. */
  title?(): unknown
  /** Replaces the description below the heading. */
  description?(): unknown
  footer?(): unknown
}>()
const slots = useSlots()

const t = computed(() => ({ ...signUpFormMessages, ...props.labels }))
const title = computed(() => props.title === undefined ? t.value.title : props.title)
const description = computed(() => props.description === undefined ? t.value.description : props.description)
const reduce = useReducedMotion()
const baseId = useId()

const { value: values, set } = useValue<SignUpValues>(() => props.values, { name: '', email: '', password: '', confirmPassword: '', terms: false, ...props.defaultValues }, next => {
  emit('update:values', next)
  emit('valuesChange', next)
})
const internalStatus = shallowRef<SignUpStatus>('idle')
const status = computed(() => props.status ?? internalStatus.value)
const revealPassword = shallowRef(false)

// "Reward early, punish late": errors are computed on every change, but a field only shows its error once
// it has been blurred (or submit touched everything). A first entry is never flagged mid-typing, while a
// field already in error clears the moment it becomes valid.
const touched = shallowRef<Partial<Record<keyof SignUpValues, boolean>>>({})
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const errors = computed<SignUpErrors>(() => {
  const current = values.value
  if (props.validate) return props.validate(current)
  const next: SignUpErrors = {}
  const text = t.value
  if (!current.name.trim()) next.name = text.nameRequired
  if (!current.email.trim()) next.email = text.emailRequired
  else if (!EMAIL_PATTERN.test(current.email)) next.email = text.emailInvalid
  if (!current.password) next.password = text.passwordRequired
  else if (current.password.length < MIN_PASSWORD_LENGTH) next.password = formatMessage(text.passwordTooShort, { count: MIN_PASSWORD_LENGTH })
  if (!current.confirmPassword) next.confirmPassword = text.confirmPasswordRequired
  else if (current.confirmPassword !== current.password) next.confirmPassword = text.passwordMismatch
  if (!current.terms) next.terms = text.termsRequired
  return next
})
function setValue<K extends keyof SignUpValues>(key: K, next: SignUpValues[K]) {
  set({ ...values.value, [key]: next })
  if (props.values === undefined && props.status === undefined && (internalStatus.value === 'success' || internalStatus.value === 'error')) internalStatus.value = 'idle'
}
function touch(key: keyof SignUpValues) { if (!touched.value[key]) touched.value = { ...touched.value, [key]: true } }
const shownError = (key: keyof SignUpValues) => touched.value[key] ? errors.value[key] : undefined
const isValid = (key: keyof SignUpValues) => Boolean(touched.value[key]) && !errors.value[key] && Boolean(values.value[key])

const STRENGTH_LABELS = ['strengthTooShort', 'strengthWeak', 'strengthFair', 'strengthGood', 'strengthStrong'] as const
const STRENGTH_COLORS = ['var(--beui-destructive)', 'var(--beui-destructive)', 'oklch(76.9% .188 70.08)', 'oklch(82.8% .189 84.429)', 'var(--beui-success, oklch(70% 0.18 155))']
const strength = computed(() => passwordStrength(values.value.password))
const showStrength = computed(() => props.strengthMeter && values.value.password.length > 0)
const isSubmitting = computed(() => status.value === 'loading')

async function submit() {
  touched.value = { name: true, email: true, password: true, confirmPassword: true, terms: true }
  if (Object.keys(errors.value).length > 0) return
  if (!props.onSubmit) return
  if (props.status === undefined) internalStatus.value = 'loading'
  try {
    await props.onSubmit({ ...values.value })
    if (props.status === undefined) internalStatus.value = 'success'
  } catch {
    if (props.status === undefined) internalStatus.value = 'error'
  }
}

// Lucide glyphs (the original imports `lucide-react`).
const PATHS: Record<string, string> = {
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  mail: '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
}
const Glyph = (glyph: { name: string }) => h('svg', {
  xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  'aria-hidden': 'true', innerHTML: PATHS[glyph.name],
})
const termsErrorId = `${baseId}-terms-error`
const formErrorId = `${baseId}-form-error`
</script>

<template>
  <form novalidate class="be-signup" :class="[className, classNames?.root]" @submit.prevent="submit">
    <div v-if="title || description || slots.title || slots.description" class="be-signup-header" :class="classNames?.header">
      <h2 v-if="title || slots.title" class="be-signup-title" :class="classNames?.title"><slot name="title">{{ title }}</slot></h2>
      <p v-if="description || slots.description" class="be-signup-description" :class="classNames?.description"><slot name="description">{{ description }}</slot></p>
    </div>

    <div class="be-signup-fields" :class="classNames?.fields">
      <Input
        :label="t.nameLabel" autocomplete="name" :placeholder="t.namePlaceholder" :disabled="isSubmitting" :model-value="values.name" :error="shownError('name')" reserve-error-line
        :success="isValid('name')" @update:model-value="setValue('name', $event)" @blur="touch('name')"
      ><template #leftIcon><Glyph name="user" /></template></Input>

      <Input
        :label="t.emailLabel" type="email" inputmode="email" autocomplete="email" :placeholder="t.emailPlaceholder" :disabled="isSubmitting" :model-value="values.email"
        :error="shownError('email')" reserve-error-line :success="isValid('email')" @update:model-value="setValue('email', $event)" @blur="touch('email')"
      ><template #leftIcon><Glyph name="mail" /></template></Input>

      <div class="be-signup-password">
        <Input
          :label="t.passwordLabel" :type="revealPassword ? 'text' : 'password'" autocomplete="new-password" :placeholder="formatMessage(t.passwordPlaceholder, { count: MIN_PASSWORD_LENGTH })"
          :disabled="isSubmitting" :model-value="values.password" :error="shownError('password')" reserve-error-line @update:model-value="setValue('password', $event)" @blur="touch('password')"
        >
          <template #leftIcon><Glyph name="lock" /></template>
          <template #rightIcon>
            <button type="button" class="be-signup-reveal" :disabled="isSubmitting" :aria-label="revealPassword ? t.hidePassword : t.showPassword" @click="revealPassword = !revealPassword">
              <Glyph :name="revealPassword ? 'eyeOff' : 'eye'" />
            </button>
          </template>
        </Input>

        <AnimatePresence :initial="false">
          <motion.div
            v-if="showStrength" class="be-signup-strength" :class="classNames?.strength" :initial="reduce ? { opacity: 0 } : { opacity: 0, y: -4 }" :animate="{ opacity: 1, y: 0 }"
            :exit="reduce ? { opacity: 0 } : { opacity: 0, y: -4 }" :transition="{ duration: 0.18, ease: easeOut }"
          >
            <div class="be-signup-bars" aria-hidden="true">
              <span v-for="index in [0, 1, 2, 3]" :key="index" class="be-signup-bar">
                <!-- scaleX rather than width: transforms only, and it keeps the bar off layout. -->
                <motion.span class="be-signup-bar-fill" :style="{ background: STRENGTH_COLORS[strength] }" :initial="false" :animate="{ scaleX: index < strength ? 1 : 0 }" :transition="reduce ? { duration: 0 } : layoutSpring" />
              </span>
            </div>
            <p aria-live="polite" class="be-signup-strength-label">{{ formatMessage(t.strength, { level: t[STRENGTH_LABELS[strength]] }) }}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <Input
        :label="t.confirmPasswordLabel" :type="revealPassword ? 'text' : 'password'" autocomplete="new-password" :placeholder="t.confirmPasswordPlaceholder" :disabled="isSubmitting"
        :model-value="values.confirmPassword" :error="shownError('confirmPassword')" reserve-error-line :success="isValid('confirmPassword')"
        @update:model-value="setValue('confirmPassword', $event)" @blur="touch('confirmPassword')"
      ><template #leftIcon><Glyph name="lock" /></template></Input>
    </div>

    <div class="be-signup-terms" :class="classNames?.terms">
      <Checkbox
        :model-value="values.terms" :disabled="isSubmitting" :label="t.terms" :aria-describedby="shownError('terms') ? termsErrorId : undefined"
        @update:model-value="setValue('terms', $event); touch('terms')"
      />
      <AnimatePresence :initial="false">
        <motion.p
          v-if="shownError('terms')" :id="termsErrorId" role="alert" class="be-signup-error" :initial="reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }"
          :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }" :exit="reduce ? { opacity: 0 } : { opacity: 0, y: -4, filter: 'blur(4px)' }" :transition="{ duration: 0.2 }"
        >{{ shownError('terms') }}</motion.p>
      </AnimatePresence>
    </div>

    <AnimatePresence :initial="false">
      <motion.p
        v-if="errorMessage" :id="formErrorId" role="alert" class="be-signup-form-error" :initial="reduce ? { opacity: 0 } : { opacity: 0, y: -4 }" :animate="{ opacity: 1, y: 0 }"
        :exit="reduce ? { opacity: 0 } : { opacity: 0, y: -4 }" :transition="{ duration: 0.2 }"
      >{{ errorMessage }}</motion.p>
    </AnimatePresence>

    <StatefulButton
      type="submit" size="lg" :state="status" :loading-text="t.submitting" :success-text="t.submitted" :error-text="t.retry" :aria-describedby="errorMessage ? formErrorId : undefined"
      class="be-signup-submit" :class="classNames?.submit"
    >{{ submitLabel ?? t.submit }}</StatefulButton>

    <div v-if="$slots.footer" class="be-signup-footer" :class="classNames?.footer"><slot name="footer" /></div>
  </form>
</template>

<style scoped>
.be-signup { display: flex; flex-direction: column; gap: 1.25rem; box-sizing: border-box; width: 100%; max-width: 24rem; padding: 1.5rem; border: 1px solid var(--beui-border); border-radius: 1.5rem; color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; text-align: start; }
.be-signup-header { display: flex; flex-direction: column; gap: .25rem; }
/* Explicit resets: a host stylesheet's heading and paragraph rules must not reshape the header. */
.be-signup-title { margin: 0; padding: 0; border: 0; font-size: 1.25rem; line-height: 1.75rem; font-weight: 600; letter-spacing: -.025em; color: var(--beui-foreground); }
.be-signup-description { margin: 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.be-signup-fields { display: flex; flex-direction: column; gap: .25rem; }
.be-signup-password { display: flex; flex-direction: column; gap: .5rem; }
.be-signup-reveal { padding: 0; border: 0; background: transparent; color: var(--beui-muted-foreground); cursor: pointer; outline: none; transition: color .15s; }
.be-signup-reveal:hover, .be-signup-reveal:focus-visible { color: var(--beui-foreground); }
.be-signup-strength { display: flex; flex-direction: column; gap: .375rem; padding-inline: .25rem; }
.be-signup-bars { display: flex; gap: .375rem; }
.be-signup-bar { flex: 1; height: .25rem; overflow: hidden; border-radius: 9999px; background: color-mix(in srgb, var(--beui-muted-foreground) 20%, transparent); }
.be-signup-bar-fill { display: block; width: 100%; height: 100%; transform-origin: left; border-radius: 9999px; }
.be-signup-strength-label { margin: 0; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
.be-signup-terms { display: flex; flex-direction: column; gap: .375rem; }
.be-signup-error { margin: 0; padding-inline: .25rem; font-size: .75rem; line-height: 1rem; color: var(--beui-destructive); }
.be-signup-form-error { margin: 0; padding: .5rem .75rem; border: 1px solid color-mix(in srgb, var(--beui-destructive) 30%, transparent); border-radius: 1rem; background: color-mix(in srgb, var(--beui-destructive) 10%, transparent); font-size: .75rem; line-height: 1rem; color: var(--beui-destructive); }
.be-signup-submit { width: 100%; }
.be-signup-footer { text-align: center; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
</style>

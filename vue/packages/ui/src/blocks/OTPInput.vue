<script setup lang="ts">
import { AnimatePresence, animate, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'
import { formatMessage, otpInputMessages } from './messages'

export type OTPStatus = 'idle' | 'error' | 'success'

const props = withDefaults(defineProps<{
  /** Number of slots. */
  length?: number
  modelValue?: string
  /** Alias of `modelValue`, kept from the original port. */
  value?: string
  defaultValue?: string
  /** Optional label rendered above the slots. */
  label?: string
  /** Helper text shown below the slots while idle. */
  hint?: string
  /** Message shown below the slots when status is "success". */
  successMessage?: string
  /** Message shown below the slots when status is "error". */
  errorMessage?: string
  /** External validation feedback. "error" shakes, "success" draws a check. */
  status?: OTPStatus
  /** Render dots instead of the typed digits. */
  mask?: boolean
  disabled?: boolean
  autoFocus?: boolean
  /** Accessible label for the underlying input. */
  ariaLabel?: string
  labels?: Partial<typeof otpInputMessages>
  className?: string
}>(), { length: 6, defaultValue: '', status: 'idle', mask: false, disabled: false, autoFocus: false })
const emit = defineEmits<{ 'update:modelValue': [value: string], change: [value: string], complete: [value: string] }>()

const t = computed(() => ({ ...otpInputMessages, ...props.labels }))
// A visible <label for> already names the input; a default aria-label would override it.
const ariaLabel = computed(() => props.ariaLabel ?? (props.label ? undefined : t.value.label))
const uid = useId()
const reduce = useReducedMotion()
const input = useTemplateRef<HTMLInputElement>('input')
const slotsEl = useTemplateRef<HTMLElement>('slotsEl')
const count = computed(() => Math.max(1, Math.floor(props.length)))

function sanitize(raw: string, length: number) { return raw.replace(/\D/g, '').slice(0, length) }
function toSlots(raw: string, length: number) {
  const digits = sanitize(raw, length)
  return Array.from({ length }, (_, index) => digits[index] ?? '')
}

// Source of truth is a fixed-length array, so a cleared middle slot stays an in-place hole
// instead of collapsing the digits after it to the left.
const controlled = computed(() => props.modelValue ?? props.value)
const slots = shallowRef<string[]>(toSlots(controlled.value ?? props.defaultValue, count.value))
const focused = shallowRef(false)
const active = shallowRef(0)
// The native input holds no value, so screen readers cannot echo what was typed. This polite
// region speaks each change instead; the alternating trailing space makes a repeated phrase new text.
const announcement = shallowRef('')
const announce = (text: string) => { announcement.value = announcement.value === text ? `${text} ` : text }
const spokenSlot = (char: string) => char ? (props.mask ? t.value.filled : char) : t.value.empty

// Pull in external value changes; skip when the parent is just echoing our own change so internal
// holes survive the controlled round-trip.
watch([controlled, count], ([incoming, length]) => {
  if (incoming === undefined) return
  const next = sanitize(incoming, length)
  if (next !== slots.value.join('')) slots.value = toSlots(next, length)
})
watch(count, length => { slots.value = toSlots(slots.value.join(''), length); active.value = Math.min(active.value, length - 1) })

function commit(next: string[]) {
  const before = slots.value
  const wasComplete = before.every(char => char !== '')
  const changed = next.flatMap((char, index) => char !== before[index] ? [index] : [])
  const progress = formatMessage(t.value.progress, { entered: next.filter(Boolean).length, total: count.value })
  if (changed.length === 1) {
    const char = next[changed[0]]
    announce(char ? formatMessage(t.value.entered, { digit: props.mask ? t.value.maskedDigit : char, progress }) : formatMessage(t.value.deleted, { progress }))
  } else if (changed.length > 1) announce(progress)
  slots.value = next
  const joined = next.join('')
  emit('update:modelValue', joined)
  emit('change', joined)
  // Fire only on the empty-to-full transition, not on every edit of a full code.
  if (!wasComplete && next.every(char => char !== '')) emit('complete', joined)
}
function clearSlot(index: number) {
  const next = [...slots.value]
  next[index] = ''
  commit(next)
}
function slotFromClientX(clientX: number) {
  const cells = slotsEl.value?.children
  if (!cells) return 0
  for (let index = 0; index < cells.length; index++) if (clientX < cells[index].getBoundingClientRect().right) return index
  return count.value - 1
}

// Single insertion path: one digit overwrites the active slot and advances; a multi-digit chunk
// (paste / SMS autofill) fills forward from the active slot.
function insert(raw: string, from = active.value) {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return
  const next = [...slots.value]
  let index = from
  for (const char of digits) {
    if (index >= count.value) break
    next[index] = char
    index++
  }
  commit(next)
  active.value = Math.min(index, count.value - 1)
}

// The keyboard is the single source of truth: preventDefault on keydown reliably blocks native
// insertion, so the hidden input never accumulates a competing string and slot holes survive.
function onKeydown(event: KeyboardEvent) {
  if (props.disabled || event.metaKey || event.ctrlKey || event.altKey) return
  const key = event.key
  if (/^[0-9]$/.test(key)) {
    event.preventDefault()
    insert(key)
  } else if (key === 'Backspace') {
    event.preventDefault()
    // A filled slot clears in place; an empty slot steps back and clears there.
    if (slots.value[active.value]) clearSlot(active.value)
    else if (active.value > 0) { clearSlot(active.value - 1); active.value = Math.max(active.value - 1, 0) }
  } else if (key === 'Delete') {
    event.preventDefault()
    clearSlot(active.value)
  } else if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End') {
    event.preventDefault()
    const to = key === 'ArrowLeft' ? Math.max(active.value - 1, 0) : key === 'ArrowRight' ? Math.min(active.value + 1, count.value - 1) : key === 'Home' ? 0 : count.value - 1
    active.value = to
    announce(formatMessage(t.value.position, { slot: spokenSlot(slots.value[to] ?? ''), position: to + 1, total: count.value }))
  }
}
function onPaste(event: ClipboardEvent) {
  if (props.disabled) return
  // preventDefault suppresses the duplicate input event, keeping that path autofill-only.
  event.preventDefault()
  insert(event.clipboardData?.getData('text') ?? '', active.value)
}
// Autofill path: an SMS one-time-code arrives as a whole value in one shot. Keystrokes go through
// keydown and paste through paste, so only autofill reaches here and spreads across the slots.
function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  const digits = sanitize(target.value, count.value)
  target.value = ''
  if (!digits) return
  commit(toSlots(digits, count.value))
  active.value = Math.min(digits.length, count.value - 1)
}
function onMousedown(event: MouseEvent) {
  if (props.disabled) return
  // Suppress the native click-caret; the active slot is driven here.
  event.preventDefault()
  // Clamp to the first empty slot so a click can't jump ahead of progress.
  const firstEmpty = slots.value.indexOf('')
  const cap = firstEmpty === -1 ? count.value - 1 : firstEmpty
  active.value = Math.min(slotFromClientX(event.clientX), cap)
  input.value?.focus()
}

// Error shake: imperative so it replays on every transition into "error".
watch(() => props.status, status => {
  if (status !== 'error' || reduce.value || !slotsEl.value) return
  animate(slotsEl.value, { x: [0, -5, 5, -3, 3, -1, 0] }, { duration: 0.45, ease: easeOut })
})
onMounted(() => { if (props.autoFocus) input.value?.focus() })

const showSuccess = computed(() => props.status === 'success')
const activeIndex = computed(() => focused.value ? active.value : -1)
const message = computed(() => showSuccess.value ? props.successMessage : props.status === 'error' ? props.errorMessage : props.hint)
const digitIn = computed(() => reduce.value ? { opacity: 0 } : { y: 14, opacity: 0, filter: 'blur(4px)' })
const digitSettled = computed(() => reduce.value ? { opacity: 1 } : { y: 0, opacity: 1, filter: 'blur(0px)' })
const digitOut = computed(() => reduce.value ? { opacity: 0 } : { y: -14, opacity: 0, filter: 'blur(4px)' })
const digitTransition = computed(() => reduce.value ? { duration: 0 } : { duration: 0.22, ease: easeOut })
</script>

<template>
  <div class="be-otp" :class="className">
    <label v-if="label" :for="`${uid}-input`" class="be-otp-label">{{ label }}</label>
    <fieldset class="be-otp-fieldset" @mousedown="onMousedown">
      <input
        :id="`${uid}-input`" ref="input" class="be-otp-input" inputmode="numeric" autocomplete="one-time-code" :disabled="disabled" :aria-label="ariaLabel"
        :aria-invalid="status === 'error'" value="" :maxlength="count" @keydown="onKeydown" @input="onInput" @paste="onPaste" @focus="focused = true" @blur="focused = false"
      >

      <div ref="slotsEl" class="be-otp-slots">
        <div
          v-for="(char, index) in slots" :key="`${uid}-${index}`" class="be-otp-slot"
          :class="[{ 'is-active': index === activeIndex && !showSuccess && status !== 'error', 'is-filled': char !== '', 'is-disabled': disabled }, showSuccess ? 'is-success' : status === 'error' ? 'is-error' : '']"
          :data-active="index === activeIndex" :data-filled="char !== ''"
        >
          <!-- Blinking caret marks the active slot: centered when empty, trailing the digit when filled. -->
          <motion.span
            v-if="index === activeIndex && !showSuccess" aria-hidden="true" class="be-otp-caret" :class="char ? 'is-trailing' : 'is-centered'"
            :animate="reduce ? undefined : { opacity: [1, 1, 0, 0] }" :transition="reduce ? undefined : { duration: 1, repeat: Infinity, ease: 'linear' }"
          />
          <!-- Digits roll vertically. Each is absolutely centered so enter and exit overlap in place. -->
          <AnimatePresence :initial="false">
            <motion.span v-if="char" :key="char" class="be-otp-digit" :initial="digitIn" :animate="digitSettled" :exit="digitOut" :transition="digitTransition">{{ mask ? '•' : char }}</motion.span>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        <motion.span
          v-if="showSuccess" aria-hidden="true" class="be-otp-check"
          :initial="reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }" :animate="reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }" :exit="reduce ? { opacity: 0 } : { scale: 0.6, opacity: 0 }"
          :transition="reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 28 }"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <title>{{ t.verified }}</title>
            <motion.path d="M5 13l4 4L19 7" :initial="reduce ? { pathLength: 1 } : { pathLength: 0 }" :animate="{ pathLength: 1 }" :transition="reduce ? { duration: 0 } : { duration: 0.35, ease: easeOut, delay: 0.1 }" />
          </svg>
        </motion.span>
      </AnimatePresence>
    </fieldset>

    <span aria-live="polite" aria-atomic="true" class="be-otp-sr">{{ announcement }}</span>

    <p v-if="message" role="status" aria-live="polite" class="be-otp-message" :class="showSuccess ? 'is-success' : status === 'error' ? 'is-error' : ''">{{ message }}</p>
  </div>
</template>

<style scoped>
.be-otp { display: inline-flex; flex-direction: column; gap: .5rem; color: var(--beui-foreground); font-size: 1rem; line-height: 1.5; }
.be-otp-label { font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.be-otp-fieldset { position: relative; display: inline-flex; width: max-content; min-width: 0; margin: 0; padding: 0; border: 0; }
.be-otp-input { position: absolute; inset: 0; z-index: 20; box-sizing: border-box; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; background: transparent; color: transparent; caret-color: transparent; opacity: 0; outline: none; cursor: text; }
.be-otp-input:disabled { cursor: not-allowed; }
.be-otp-slots { display: flex; align-items: center; gap: .5rem; }
.be-otp-slot { position: relative; display: grid; box-sizing: border-box; place-items: center; width: 3rem; height: 3.5rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: .75rem; font-size: 1.25rem; line-height: 1.75rem; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); transition: color .2s, border-color .2s, background-color .2s; }
.be-otp-slot.is-filled { border-color: color-mix(in srgb, var(--beui-foreground) 11%, transparent); color: var(--beui-foreground); }
.be-otp-slot.is-success { border-color: rgb(16 185 129 / .6); color: var(--beui-foreground); }
.be-otp-slot.is-error { border-color: color-mix(in srgb, var(--beui-destructive) 60%, transparent); color: var(--beui-foreground); }
.be-otp-slot.is-active { border-color: var(--beui-foreground); }
.be-otp-slot.is-disabled { opacity: .5; }
.be-otp-caret { position: absolute; top: 50%; width: 1px; height: 1.5rem; background: var(--beui-foreground); pointer-events: none; }
.be-otp-caret.is-centered { left: 50%; translate: -50% -50%; }
.be-otp-caret.is-trailing { right: .75rem; translate: 0 -50%; }
.be-otp-digit { position: absolute; inset: 0; display: grid; place-items: center; line-height: 1; }
.be-otp-check { position: absolute; top: 50%; right: -1.75rem; display: inline-flex; translate: 0 -50%; color: #10b981; pointer-events: none; }
.be-otp-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.be-otp-message { margin: 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.be-otp-message.is-success { color: #10b981; }
.be-otp-message.is-error { color: var(--beui-destructive); }
</style>

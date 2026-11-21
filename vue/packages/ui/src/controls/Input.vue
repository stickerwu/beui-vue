<script setup lang="ts">
import { animate, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, shallowRef, useAttrs, useId, useTemplateRef, watch } from 'vue'

defineOptions({ inheritAttrs: false })
const { label, error, success, reserveErrorLine = false, id } = defineProps<{
  label?: string
  /** Truthy error triggers a shake, red border and (if a string) a message. */
  error?: string | boolean
  /** Reserve one message line so validation does not shift nearby content. */
  reserveErrorLine?: boolean
  success?: boolean
  id?: string
}>()
const value = defineModel<string>({ default: '' })
defineSlots<{ leftIcon?: () => unknown; rightIcon?: () => unknown }>()
const attrs = useAttrs()
const uid = useId()
const inputId = computed(() => id ?? uid)
const reduce = useReducedMotion()
const focused = shallowRef(false)
const field = useTemplateRef<HTMLDivElement>('field')

const hasError = computed(() => Boolean(error))
const errorMessage = computed(() => (typeof error === 'string' && error ? error : null))
// Right edge shows the success check, otherwise the caller's right icon.
const showRight = computed(() => !success)

const state = computed(() => (hasError.value ? 'error' : success ? 'success' : focused.value ? 'focused' : 'idle'))
const describedBy = computed(() => [attrs['aria-describedby'], errorMessage.value ? `${inputId.value}-error` : null].filter(Boolean).join(' ') || undefined)

// Shake the field when an error appears.
watch(hasError, next => {
  const element = field.value
  if (!element || reduce.value || !next) return
  animate(element, { x: [0, -6, 6, -4, 4, -2, 0] }, { duration: 0.45 })
})
</script>

<template>
  <div class="be-input" :class="attrs.class" :style="attrs.style as Record<string, string>">
    <label v-if="label" :for="inputId" class="be-input-label">{{ label }}</label>
    <div ref="field" class="be-input-field" :data-state="state">
      <span v-if="$slots.leftIcon" class="be-input-left"><slot name="leftIcon" /></span>
      <input v-bind="{ ...attrs, class: undefined, style: undefined }" :id="inputId" v-model="value" class="be-input-native"
        :aria-invalid="hasError || undefined" :aria-describedby="describedBy"
        :data-left="$slots.leftIcon ? '' : undefined" :data-right="showRight && $slots.rightIcon || success ? '' : undefined"
        @focus="focused = true" @blur="focused = false" />
      <svg v-if="success" viewBox="0 0 24 24" fill="none" class="be-input-success" aria-hidden="true">
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" :stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          :initial="reduce ? { pathLength: 1 } : { pathLength: 0 }" :animate="{ pathLength: 1 }" :transition="{ duration: 0.35, ease: 'easeOut' }" />
      </svg>
      <span v-else-if="$slots.rightIcon" class="be-input-right"><slot name="rightIcon" /></span>
    </div>
    <div :class="reserveErrorLine ? 'be-input-reserve' : 'be-input-contents'">
      <Transition name="be-input-error">
        <p v-if="errorMessage" :id="`${inputId}-error`" role="alert" class="be-input-error">{{ errorMessage }}</p>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.be-input { display: flex; flex-direction: column; gap: .375rem; }
.be-input-label { padding-inline: .25rem; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
.be-input-field { position: relative; box-sizing: border-box; height: 2.75rem; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 999px; transition: border-color .2s, box-shadow .2s; }
.be-input-field:has(.be-input-native:disabled) { opacity: .6; }
.be-input-field[data-state=focused] { border-color: color-mix(in srgb, var(--beui-foreground) 40%, transparent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 5%, transparent); }
.be-input-field[data-state=error] { border-color: var(--beui-destructive); box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-destructive) 25%, transparent); }
.be-input-left { pointer-events: none; position: absolute; left: .75rem; top: 50%; display: flex; transform: translateY(-50%); align-items: center; color: var(--beui-muted-foreground); }
.be-input-left :deep(svg) { width: 1rem; height: 1rem; }
.be-input-native { box-sizing: border-box; height: 100%; width: 100%; padding: 0 .875rem; border: 0; background: transparent; color: var(--beui-foreground); caret-color: var(--beui-foreground); font: inherit; font-size: 1rem; line-height: 1.5rem; outline: none; }
.be-input-native::placeholder { color: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); }
.be-input-native[data-left] { padding-left: 2.5rem; }
.be-input-native[data-right] { padding-right: 2.5rem; }
.be-input-native:disabled { cursor: not-allowed; }
.be-input-success { position: absolute; right: .875rem; top: 50%; width: 1.25rem; height: 1.25rem; transform: translateY(-50%); color: var(--beui-success, oklch(70% 0.18 155)); }
.be-input-right { position: absolute; right: 0; top: 0; display: flex; height: 100%; align-items: center; color: var(--beui-muted-foreground); }
.be-input-right :deep(button) { display: grid; width: 2.75rem; height: 2.75rem; place-items: center; }
.be-input-right :deep(svg) { width: 1rem; height: 1rem; }
.be-input-contents { display: contents; }
.be-input-reserve { min-height: 1rem; }
.be-input-error { margin: 0; padding-inline: .25rem; font-size: .75rem; line-height: 1rem; color: var(--beui-destructive); }
.be-input-error-enter-active, .be-input-error-leave-active { transition: opacity .2s, transform .2s, filter .2s; }
.be-input-error-enter-from, .be-input-error-leave-to { opacity: 0; transform: translateY(-4px); filter: blur(4px); }
@media (prefers-reduced-motion: reduce) {
  .be-input-error-enter-active, .be-input-error-leave-active { transition: opacity .2s; }
  .be-input-error-enter-from, .be-input-error-leave-to { opacity: 0; transform: none; filter: none; }
}
</style>

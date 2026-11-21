<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, useId } from 'vue'
import { layoutSpring, pressSpring } from '../core/motion'
import type { ChoiceOption } from './types'

const props = withDefaults(defineProps<{
  options: readonly ChoiceOption[]
  name?: string
  /** Accessible name for the group when no visible label names it. */
  label?: string
  /** Id of a visible element that names the group (takes over from `label`). */
  labelledby?: string
  orientation?: 'vertical' | 'horizontal'
  disabled?: boolean
  required?: boolean
}>(), { label: 'Options', orientation: 'vertical' })
const value = defineModel<string>()
const uid = useId()
const reduce = useReducedMotion()

// Resolved during render so the group has exactly one tab stop in the same
// commit that changes the selection or the options.
const tabStop = computed(() => {
  const enabled = props.options.filter(option => !props.disabled && !option.disabled)
  return enabled.some(option => option.value === value.value) ? value.value : enabled[0]?.value
})

function select(option: ChoiceOption) {
  if (props.disabled || option.disabled) return
  value.value = option.value
}

// Arrow keys move to the next enabled option in the group, wrapping at the
// ends, and select it as focus arrives, like native radio buttons.
function onKeydown(event: KeyboardEvent) {
  const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0
  if (!step) return
  const current = event.currentTarget as HTMLButtonElement
  const group = current.closest('[role="radiogroup"]')
  const radios = Array.from(group?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []).filter(radio => !radio.disabled)
  const at = radios.indexOf(current)
  if (at < 0 || radios.length < 2) return
  event.preventDefault()
  const next = radios[(at + step + radios.length) % radios.length]
  next.focus()
  next.click()
}
</script>

<template>
  <div class="be-radio-group" role="radiogroup" :aria-label="labelledby ? undefined : label" :aria-labelledby="labelledby" :data-orientation="orientation">
    <input v-if="name" type="hidden" :name="name" :value="value ?? ''" :required="required" :disabled="disabled">
    <label
      v-for="(option, index) in options"
      :key="option.value"
      :for="`${uid}-${index}`"
      class="be-radio"
      :data-description="option.detail ? '' : undefined"
      :data-disabled="disabled || option.disabled || undefined"
    >
      <motion.button
        :id="`${uid}-${index}`"
        type="button"
        role="radio"
        class="be-radio-button"
        :aria-checked="value === option.value"
        :aria-labelledby="option.detail ? `${uid}-label-${index}` : undefined"
        :aria-describedby="option.detail ? `${uid}-detail-${index}` : undefined"
        :disabled="disabled || option.disabled"
        :tabindex="!disabled && !option.disabled && tabStop === option.value ? 0 : -1"
        :data-state="value === option.value ? 'checked' : 'unchecked'"
        :while-tap="reduce || disabled || option.disabled ? undefined : { scale: 0.92 }"
        :transition="pressSpring"
        @click="select(option)"
        @keydown="onKeydown"
      >
        <motion.span
          v-if="value === option.value"
          class="be-radio-dot"
          :layout-id="`${uid}-dot`"
          :transition="reduce ? { duration: 0 } : layoutSpring"
        />
      </motion.button>
      <span class="be-radio-text">
        <span :id="`${uid}-label-${index}`" class="be-radio-label"><slot name="label" :option="option">{{ option.label }}</slot></span>
        <span v-if="option.detail" :id="`${uid}-detail-${index}`" class="be-radio-description">{{ option.detail }}</span>
      </span>
    </label>
  </div>
</template>

<style scoped>
.be-radio-group { display: flex; gap: 0.75rem; }
.be-radio-group[data-orientation='vertical'] { flex-direction: column; }
.be-radio-group[data-orientation='horizontal'] { flex-flow: row wrap; }
.be-radio { display: inline-flex; align-items: center; gap: 0.75rem; cursor: pointer; }
.be-radio[data-description] { align-items: flex-start; }
.be-radio[data-disabled] { cursor: not-allowed; }
.be-radio-button {
  position: relative; display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center;
  box-sizing: border-box; width: 1.25rem; height: 1.25rem; padding: 0; border-radius: 9999px;
  border: 2px solid color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent);
  background: transparent; color: inherit; outline: none; cursor: inherit;
  transition: color 0.2s, background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
}
@media (hover: hover) { .be-radio-button:hover:not([data-state='checked']) { border-color: var(--beui-muted-foreground); } }
.be-radio-button[data-state='checked'] { border-color: var(--beui-primary); }
.be-radio-button:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-radio-button:disabled { opacity: 0.6; cursor: not-allowed; }
.be-radio-dot { position: absolute; inset: 0.25rem; border-radius: 9999px; background: var(--beui-primary); }
.be-radio-text { display: flex; min-width: 0; flex-direction: column; gap: 0.125rem; user-select: none; }
.be-radio[data-disabled] .be-radio-text { opacity: 0.6; }
.be-radio-label { font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.be-radio[data-description] .be-radio-label { line-height: 1rem; }
.be-radio-description { font-size: 0.75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
@media (forced-colors: active) { .be-radio-dot { background: Highlight; forced-color-adjust: none; } .be-radio-button[data-state='checked'] { border-color: Highlight; } }
</style>

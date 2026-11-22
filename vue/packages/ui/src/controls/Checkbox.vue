<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const checkboxMessages = {
  checked: 'Selected',
  indeterminate: 'Partially selected',
}
export type CheckboxMessages = typeof checkboxMessages
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, useId } from 'vue'
import { easeOut, pressSpring } from '../core/motion'

const CHECK_PATH = 'M5 13l4 4L19 7'
const INDETERMINATE_PATH = 'M6 12h12'

const props = withDefaults(defineProps<{
  label?: string
  /** Supporting text under the label, announced as the description rather than the name. */
  description?: string
  indeterminate?: boolean
  disabled?: boolean
  name?: string
  value?: string
  required?: boolean
  id?: string
  ariaLabel?: string
  /** Associates an external message (e.g. a form error) with the control. */
  ariaDescribedby?: string
  /** Override any built-in string. */
  labels?: Partial<CheckboxMessages>
}>(), { value: 'on' })

const checked = defineModel<boolean>({ default: false })
const reduce = useReducedMotion()
const autoId = useId()
const uid = computed(() => props.id ?? autoId)
const strings = computed(() => ({ ...checkboxMessages, ...props.labels }))
const showMark = computed(() => checked.value || props.indeterminate)
const markKey = computed(() => props.indeterminate ? 'indeterminate' : 'checked')
const path = computed(() => props.indeterminate ? INDETERMINATE_PATH : CHECK_PATH)
const descriptionId = computed(() => props.description ? `${uid.value}-description` : undefined)
// The wrapping <label> would fold the description into the name, so name from the label text alone.
const labelId = computed(() => props.description && props.label && !props.ariaLabel ? `${uid.value}-label` : undefined)
const describedBy = computed(() => [props.ariaDescribedby, descriptionId.value].filter(Boolean).join(' ') || undefined)
const state = computed(() => checked.value ? 'checked' : props.indeterminate ? 'indeterminate' : 'unchecked')

function toggle(event: MouseEvent) {
  // WebKit treats a click on the check mark (an SVG child of the button) as a click on the label
  // itself and sends the button a second, synthetic click, which would toggle it back. Cancelling
  // the default action stops the label's activation behaviour; the button has no other default.
  event.preventDefault()
  if (!props.disabled) checked.value = !checked.value
}
</script>

<template>
  <label :for="uid" class="be-checkbox" :data-description="description ? '' : undefined" :data-disabled="disabled || undefined">
    <motion.button
      :id="uid"
      type="button"
      role="checkbox"
      class="be-checkbox-box"
      :aria-checked="indeterminate ? 'mixed' : checked"
      :aria-label="ariaLabel"
      :aria-labelledby="labelId"
      :aria-describedby="describedBy"
      :aria-required="required || undefined"
      :disabled="disabled"
      :data-state="state"
      :while-tap="reduce || disabled ? undefined : { scale: 0.92 }"
      :transition="pressSpring"
      @click="toggle"
    >
      <AnimatePresence :initial="false">
        <motion.svg
          v-if="showMark"
          :key="markKey"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          :stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          :initial="reduce ? { opacity: 1 } : { opacity: 0, scale: 0.5 }"
          :animate="reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }"
          :exit="reduce ? { opacity: 0 } : { opacity: 0, scale: 0.5, filter: 'blur(4px)' }"
          :transition="reduce ? { duration: 0 } : { duration: 0.16, ease: easeOut }"
          aria-hidden="true"
        >
          <title>{{ strings[markKey] }}</title>
          <motion.path
            :d="path"
            :initial="reduce ? { pathLength: 1 } : { pathLength: 0 }"
            :animate="{ pathLength: 1 }"
            :transition="reduce ? { duration: 0 } : { duration: indeterminate ? 0.2 : 0.3, ease: easeOut, delay: 0.04 }"
          />
        </motion.svg>
      </AnimatePresence>
    </motion.button>
    <input v-if="name" type="hidden" :name="name" :value="value" :disabled="!checked || disabled">
    <span v-if="label || description || $slots.default" class="be-checkbox-text">
      <span v-if="label || $slots.default" :id="labelId" class="be-checkbox-label"><slot>{{ label }}</slot></span>
      <span v-if="description" :id="descriptionId" class="be-checkbox-description">{{ description }}</span>
    </span>
  </label>
</template>

<style scoped>
.be-checkbox { display: inline-flex; align-items: center; gap: 0.75rem; cursor: pointer; }
.be-checkbox[data-description] { align-items: flex-start; }
.be-checkbox[data-disabled] { cursor: not-allowed; }
.be-checkbox-box {
  display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center;
  box-sizing: border-box; width: 1.25rem; height: 1.25rem; padding: 0; border-radius: 0.375rem;
  border: 2px solid color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent);
  background: var(--beui-background); color: inherit; outline: none; cursor: inherit;
  transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
@media (hover: hover) {
  .be-checkbox-box:hover:not([data-state='checked'], [data-state='indeterminate']) { border-color: var(--beui-muted-foreground); }
}
.be-checkbox-box[data-state='checked'], .be-checkbox-box[data-state='indeterminate'] {
  border-color: var(--beui-primary); background: var(--beui-primary); color: var(--beui-primary-foreground);
}
.be-checkbox-box:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-checkbox-box:disabled { opacity: 0.6; cursor: not-allowed; }
.be-checkbox-text { display: flex; min-width: 0; flex-direction: column; gap: 0.125rem; user-select: none; }
.be-checkbox[data-disabled] .be-checkbox-text { opacity: 0.6; }
.be-checkbox-label { font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.be-checkbox[data-description] .be-checkbox-label { line-height: 1rem; }
.be-checkbox-description { font-size: 0.75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
@media (forced-colors: active) {
  .be-checkbox-box[data-state='checked'], .be-checkbox-box[data-state='indeterminate'] { border-color: Highlight; color: Highlight; }
}
</style>

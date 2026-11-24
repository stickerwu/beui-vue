<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, useId, useSlots, watch, type VNode } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { layoutSpring, pressSpring } from '../core/motion'
import { useRadioGroup } from './radio/context'

// One option of a `RadioGroup`. `class` lands on the wrapping label.
const props = defineProps<{
  value: string
  label?: string
  /** Supporting text under the label, announced as the description rather than the name. */
  description?: string
  disabled?: boolean
  /** Id of the radio button. */
  id?: string
}>()
defineSlots<{
  /** Rich label; takes over from the `label` prop. */
  label?: () => VNode[]
}>()
const slots = useSlots()
const group = useRadioGroup()
const reduce = useReducedMotion()
const autoId = useId()
const buttonId = computed(() => props.id ?? autoId)
const selected = computed(() => group.value.value === props.value)
const off = computed(() => group.disabled.value || Boolean(props.disabled))
const hasLabel = computed(() => Boolean(props.label) || Boolean(slots.label))
const descriptionId = computed(() => (props.description ? `${buttonId.value}-description` : undefined))
// The wrapping <label> would fold the description into the name, so name from the label text alone.
const labelId = computed(() => (props.description && hasLabel.value ? `${buttonId.value}-label` : undefined))
const tabIndex = computed(() => (!off.value && (group.tabStop.value === null || group.tabStop.value === props.value) ? 0 : -1))

function register() {
  group.register(props.value, off.value)
}
onMounted(register)
watch([() => props.value, off], ([value], [previous]) => {
  if (value !== previous) group.unregister(previous)
  register()
})
onBeforeUnmount(() => group.unregister(props.value))

// Arrow keys move to the next enabled option in the group, wrapping at the
// ends, and select it as focus arrives, like native radio buttons.
function onKeydown(event: KeyboardEvent) {
  const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0
  if (!step) return
  const current = event.currentTarget as HTMLButtonElement
  const root = current.closest('[role="radiogroup"]')
  const radios = Array.from(root?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? []).filter(
    radio => !radio.disabled && radio.closest('[role="radiogroup"]') === root,
  )
  const at = radios.indexOf(current)
  if (at < 0 || radios.length < 2) return
  event.preventDefault()
  const next = radios[(at + step + radios.length) % radios.length]
  next.focus()
  next.click()
}
</script>

<template>
  <label class="be-radio" :for="buttonId" :data-description="description ? '' : undefined" :data-disabled="off || undefined">
    <motion.button
      :id="buttonId"
      type="button"
      role="radio"
      class="be-radio-button"
      :aria-checked="selected"
      :aria-labelledby="labelId"
      :aria-describedby="descriptionId"
      :disabled="off"
      :tabindex="tabIndex"
      :data-state="selected ? 'checked' : 'unchecked'"
      :while-press="reduce || off ? undefined : { scale: 0.92 }"
      :transition="pressSpring"
      @click="!off && group.setValue(value)"
      @keydown="onKeydown"
    >
      <motion.span
        v-if="selected"
        class="be-radio-dot"
        :layout-id="group.layoutId"
        :transition="reduce ? { duration: 0 } : layoutSpring"
      />
    </motion.button>
    <span v-if="hasLabel || description" class="be-radio-text">
      <span v-if="hasLabel" :id="labelId" class="be-radio-label"><slot name="label">{{ label }}</slot></span>
      <span v-if="description" :id="descriptionId" class="be-radio-description">{{ description }}</span>
    </span>
  </label>
</template>

<style scoped>
.be-radio { display: inline-flex; align-items: center; gap: 0.75rem; cursor: pointer; }
.be-radio[data-description] { align-items: flex-start; }
.be-radio[data-disabled] { cursor: not-allowed; }
.be-radio-button {
  position: relative; display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center;
  box-sizing: border-box; width: 1.25rem; height: 1.25rem; padding: 0; border-radius: calc(infinity * 1px);
  border: 2px solid color-mix(in srgb, var(--beui-muted-foreground) 50%, transparent);
  background: transparent; color: inherit; outline: none; cursor: inherit;
  transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
@media (hover: hover) { .be-radio-button:hover:not([data-state='checked']) { border-color: var(--beui-muted-foreground); } }
.be-radio-button[data-state='checked'] { border-color: var(--beui-primary); }
.be-radio-button:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-radio-button:disabled { opacity: 0.6; cursor: not-allowed; }
.be-radio-dot { position: absolute; inset: 0.25rem; border-radius: calc(infinity * 1px); background: var(--beui-primary); }
.be-radio-text { display: flex; min-width: 0; flex-direction: column; gap: 0.125rem; user-select: none; }
.be-radio[data-disabled] .be-radio-text { opacity: 0.6; }
.be-radio-label { font-size: 0.875rem; line-height: 1.25rem; color: var(--beui-foreground); }
.be-radio[data-description] .be-radio-label { line-height: 1rem; }
.be-radio-description { font-size: 0.75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
@media (forced-colors: active) { .be-radio-dot { background: Highlight; forced-color-adjust: none; } .be-radio-button[data-state='checked'] { border-color: Highlight; } }
</style>

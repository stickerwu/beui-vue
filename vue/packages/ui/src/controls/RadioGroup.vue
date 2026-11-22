<script setup lang="ts">
import { computed, provide, ref, shallowRef, useId, type VNode } from 'vue'
import RadioGroupItem from './RadioGroupItem.vue'
import { radioKey } from './radio/context'
import type { ChoiceOption } from './types'

// `aria-label` and `aria-labelledby` fall through to the group element, and so
// does `class`.
const props = withDefaults(defineProps<{
  /** Initial value when `v-model` is not used. */
  defaultValue?: string
  orientation?: 'vertical' | 'horizontal'
  /** Shorthand for a list of options; use `RadioGroupItem` children for full control. */
  options?: readonly ChoiceOption[]
  name?: string
  /** Accessible name for the group when no visible label names it. Same as `aria-label`. */
  label?: string
  /** Id of a visible element that names the group. Same as `aria-labelledby`. */
  labelledby?: string
  disabled?: boolean
  required?: boolean
}>(), { orientation: 'vertical' })
defineSlots<{
  /** `RadioGroupItem` children. */
  default?: () => VNode[]
  /** Label of an option in `options` mode. */
  label?: (props: { option: ChoiceOption }) => VNode[]
}>()
const model = defineModel<string>()
const local = ref(props.defaultValue ?? '')
const current = computed(() => model.value ?? local.value)
const layoutId = useId()

function setValue(next: string) {
  if (model.value === undefined) local.value = next
  model.value = next
}

const registered = shallowRef<ReadonlyMap<string, boolean>>(new Map())
function register(value: string, disabled: boolean) {
  if (registered.value.get(value) === disabled) return
  registered.value = new Map(registered.value).set(value, disabled)
}
function unregister(value: string) {
  if (!registered.value.has(value)) return
  const next = new Map(registered.value)
  next.delete(value)
  registered.value = next
}
// Resolved during render so the group has exactly one tab stop in the same
// commit that changes the selection or the options.
const tabStop = computed<string | null>(() => {
  if (registered.value.size === 0) return null
  const enabled = Array.from(registered.value).filter(([, disabled]) => !disabled && !props.disabled)
  return enabled.some(([value]) => value === current.value) ? current.value : (enabled[0]?.[0] ?? '')
})

provide(radioKey, {
  value: current,
  setValue,
  layoutId,
  disabled: computed(() => Boolean(props.disabled)),
  tabStop,
  options: registered,
  register,
  unregister,
})
</script>

<template>
  <div class="be-radio-group" role="radiogroup" :aria-label="label" :aria-labelledby="labelledby" :data-orientation="orientation">
    <input v-if="name" type="hidden" :name="name" :value="current" :required="required" :disabled="disabled">
    <slot />
    <template v-if="options">
      <RadioGroupItem v-for="option in options" :key="option.value" :value="option.value" :label="option.label" :description="option.detail" :disabled="option.disabled">
        <template v-if="$slots.label" #label><slot name="label" :option="option">{{ option.label }}</slot></template>
      </RadioGroupItem>
    </template>
  </div>
</template>

<style scoped>
.be-radio-group { display: flex; gap: 0.75rem; }
.be-radio-group[data-orientation='vertical'] { flex-direction: column; }
.be-radio-group[data-orientation='horizontal'] { flex-flow: row wrap; }
</style>

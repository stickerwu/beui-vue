<script lang="ts">
export { multiSelectMessages, type MultiSelectMessages } from './messages'
</script>

<script setup lang="ts">
import type { ChoiceOption } from '../types'
import { defaultFilter, type ComboFilter, type ComboLabels, type ComboOptionsProps } from './combo-types'
import { useComboRoot } from './combo-context'
import ComboOptions from './ComboOptions.vue'
import './combo.css'

/**
 * A searchable multiple select: chips for the chosen options, an input that filters the rest in a
 * panel that grows out of the field. Compose `MultiSelectTrigger`, `MultiSelectValue`,
 * `MultiSelectInput`, `MultiSelectContent`, `MultiSelectList` and `MultiSelectItem`, or pass
 * `options` for the shorthand. Ported from `components/motion/multi-select`.
 */
export type MultiSelectProps = ComboOptionsProps & {
  modelValue?: string[]
  defaultValue?: string[]
  open?: boolean
  defaultOpen?: boolean
  query?: string
  defaultQuery?: string
  filter?: ComboFilter
  disabled?: boolean
  /** Form field name; a hidden input carries each selected value. */
  name?: string
  /** Override any built-in string. `{label}` fills the option label. */
  labels?: ComboLabels
}
const props = withDefaults(defineProps<MultiSelectProps>(), { modelValue: undefined, defaultValue: () => [], open: undefined, defaultOpen: false, query: undefined, defaultQuery: '', filter: defaultFilter, disabled: false, options: undefined, side: 'bottom', align: 'start', sideOffset: 6, avoidCollisions: true })
const emit = defineEmits<{ 'update:modelValue': [value: string[]]; 'update:open': [open: boolean]; 'update:query': [query: string] }>()
defineSlots<{
  default?(): unknown
  /** Row content in `options` mode. */
  option?(props: { option: ChoiceOption; selected: boolean; active: boolean }): unknown
  /** Chip label in `options` mode. */
  chip?(props: { option: ChoiceOption | undefined; value: string; label: string }): unknown
}>()

const { context, rootEl } = useComboRoot({ kind: 'multi-select', props, emit: emit as never })
</script>

<template>
  <div ref="rootEl" class="be-combo">
    <template v-if="name"><input v-for="v in context.values.value" :key="v" type="hidden" :name="name" :value="v" :disabled="disabled"></template>
    <ComboOptions v-if="options" multiple :options="options" :label="label" :placeholder="placeholder" :empty="empty" :list-label="listLabel" :side="side" :align="align" :side-offset="sideOffset" :avoid-collisions="avoidCollisions" :group-separator="groupSeparator" :show-icon="showIcon" :trigger-style="triggerStyle" :content-style="contentStyle" :list-style="listStyle">
      <template v-if="$slots.option" #option="slotProps"><slot name="option" v-bind="slotProps" /></template>
      <template v-if="$slots.chip" #chip="slotProps"><slot name="chip" v-bind="slotProps" /></template>
    </ComboOptions>
    <slot v-else />
  </div>
</template>

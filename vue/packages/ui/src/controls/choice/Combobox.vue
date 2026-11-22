<script lang="ts">
export { comboboxMessages, type ComboboxMessages } from './messages'
</script>

<script setup lang="ts">
import type { ChoiceOption } from '../types'
import { defaultFilter, type ComboFilter, type ComboLabels, type ComboOptionsProps } from './combo-types'
import { useComboRoot } from './combo-context'
import ComboOptions from './ComboOptions.vue'
import './combo.css'

/**
 * A searchable single select: an input that filters a list of options in a panel that grows out of
 * the field. Compose `ComboboxTrigger`, `ComboboxInput`, `ComboboxContent`, `ComboboxList` and
 * `ComboboxItem`, or pass `options` for the shorthand. Ported from `components/motion/combobox`.
 */
export type ComboboxProps = ComboOptionsProps & {
  modelValue?: string
  defaultValue?: string
  open?: boolean
  defaultOpen?: boolean
  query?: string
  defaultQuery?: string
  filter?: ComboFilter
  disabled?: boolean
  /** Form field name; a hidden input carries the selected value. */
  name?: string
  /** Override any built-in string. */
  labels?: ComboLabels
}
const props = withDefaults(defineProps<ComboboxProps>(), { modelValue: undefined, defaultValue: undefined, open: undefined, defaultOpen: false, query: undefined, defaultQuery: '', filter: defaultFilter, disabled: false, options: undefined, side: 'bottom', align: 'start', sideOffset: 6, avoidCollisions: true })
const emit = defineEmits<{ 'update:modelValue': [value: string]; 'update:open': [open: boolean]; 'update:query': [query: string] }>()
defineSlots<{
  default?(): unknown
  /** Row content in `options` mode. */
  option?(props: { option: ChoiceOption; selected: boolean; active: boolean }): unknown
}>()

const { context, rootEl } = useComboRoot({ kind: 'combobox', props, emit: emit as never })
</script>

<template>
  <div ref="rootEl" class="be-combo">
    <input v-if="name && context.value.value !== undefined" type="hidden" :name="name" :value="context.value.value" :disabled="disabled">
    <ComboOptions v-if="options" :multiple="false" :options="options" :label="label" :placeholder="placeholder" :empty="empty" :list-label="listLabel" :side="side" :align="align" :side-offset="sideOffset" :avoid-collisions="avoidCollisions" :group-separator="groupSeparator" :show-icon="showIcon" :trigger-style="triggerStyle" :content-style="contentStyle" :list-style="listStyle">
      <template v-if="$slots.option" #option="slotProps"><slot name="option" v-bind="slotProps" /></template>
    </ComboOptions>
    <slot v-else />
  </div>
</template>

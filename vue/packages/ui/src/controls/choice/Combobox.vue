<script lang="ts">
export { comboboxMessages, type ComboboxMessages } from './messages'
</script>

<script setup lang="ts">
import ComboField from './ComboField.vue'
import type { ComboFieldProps } from './combo-types'
import type { ChoiceOption } from '../types'

export type ComboboxProps = Omit<ComboFieldProps, 'multiple' | 'modelValue' | 'defaultValue' | 'showIcon'> & {
  modelValue?: string
  defaultValue?: string
}
const props = withDefaults(defineProps<ComboboxProps>(), { open: undefined, query: undefined })
defineEmits<{ 'update:modelValue': [value: string]; 'update:open': [open: boolean]; 'update:query': [query: string] }>()
defineSlots<{ option?: (props: { option: ChoiceOption; selected: boolean; active: boolean }) => unknown }>()
</script>

<template>
  <ComboField v-bind="props" :multiple="false" @update:model-value="$emit('update:modelValue', $event)" @update:open="$emit('update:open', $event)" @update:query="$emit('update:query', $event)">
    <template v-if="$slots.option" #option="slotProps"><slot name="option" v-bind="slotProps" /></template>
  </ComboField>
</template>

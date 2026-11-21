<script lang="ts">
export { multiSelectMessages, type MultiSelectMessages } from './messages'
</script>

<script setup lang="ts">
import ComboField from './ComboField.vue'
import type { ComboFieldProps } from './combo-types'
import type { ChoiceOption } from '../types'

export type MultiSelectProps = Omit<ComboFieldProps, 'multiple' | 'modelValue' | 'defaultValue'> & {
  modelValue?: string[]
  defaultValue?: string[]
}
const props = withDefaults(defineProps<MultiSelectProps>(), { open: undefined, query: undefined })
defineEmits<{ 'update:modelValue': [value: string[]]; 'update:open': [open: boolean]; 'update:query': [query: string] }>()
defineSlots<{ option?: (props: { option: ChoiceOption; selected: boolean; active: boolean }) => unknown; chip?: (props: { option: ChoiceOption | undefined; value: string; label: string }) => unknown }>()
</script>

<template>
  <ComboField v-bind="props" multiple @update:model-value="$emit('update:modelValue', $event)" @update:open="$emit('update:open', $event)" @update:query="$emit('update:query', $event)">
    <template v-if="$slots.option" #option="slotProps"><slot name="option" v-bind="slotProps" /></template>
    <template v-if="$slots.chip" #chip="slotProps"><slot name="chip" v-bind="slotProps" /></template>
  </ComboField>
</template>

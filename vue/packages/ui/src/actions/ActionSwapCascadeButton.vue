<script setup lang="ts">
import ActionSwap, { type ActionSwapItem, type ActionSwapProps } from './ActionSwap.vue'

/** `ActionSwap` with the cascade animation fixed. */
const props = withDefaults(defineProps<Omit<ActionSwapProps, 'animation'>>(), { variant: 'secondary', size: 'md', cycle: true, iconOnly: undefined, disabled: false })
const emit = defineEmits<{ 'update:modelValue': [value: string]; valueChange: [value: string, item: ActionSwapItem] }>()
defineSlots<{
  /** Icon for the current item. */
  icon?(props: { item: ActionSwapItem }): unknown
  /** Label for the current item. Defaults to its `label`. */
  default?(props: { item: ActionSwapItem }): unknown
}>()
</script>

<template>
  <ActionSwap v-bind="props" animation="cascade" @update:model-value="emit('update:modelValue', $event)" @value-change="(value, item) => emit('valueChange', value, item)">
    <template v-if="$slots.icon" #icon="slotProps"><slot name="icon" v-bind="slotProps" /></template>
    <template v-if="$slots.default" #default="slotProps"><slot v-bind="slotProps" /></template>
  </ActionSwap>
</template>

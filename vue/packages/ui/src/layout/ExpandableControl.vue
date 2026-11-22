<script setup lang="ts">
import type { VNode } from 'vue'
import ExpandableButton from './ExpandableButton.vue'
import ExpandableChip from './ExpandableChip.vue'

// Convenience wrapper over `ExpandableButton` and `ExpandableChip` (the two
// components the upstream package exports): pick one with `variant`.
const props = withDefaults(defineProps<{
  /** `button` grows from an icon to an icon + label; `chip` reveals a trailing action. */
  variant?: 'button' | 'chip'
  label: string
  /** Accessible name of the chip's trailing action. */
  actionLabel?: string
  disabled?: boolean
  /** Controlled expanded state. */
  expanded?: boolean
  defaultExpanded?: boolean
  /** Collapse the chip and return focus to its label after the action runs. */
  collapseOnAction?: boolean
}>(), { variant: 'button', defaultExpanded: false, collapseOnAction: true, expanded: undefined })
const emit = defineEmits<{
  activate: [event: MouseEvent]
  remove: [event: MouseEvent]
  'update:expanded': [expanded: boolean]
  expandedChange: [expanded: boolean]
}>()
defineSlots<{ icon?: () => VNode[]; actionIcon?: () => VNode[] }>()
</script>

<template>
  <ExpandableButton
    v-if="props.variant === 'button'"
    :label="props.label"
    :expanded="props.expanded"
    :default-expanded="props.defaultExpanded"
    :disabled="props.disabled"
    @click="emit('activate', $event)"
    @update:expanded="emit('update:expanded', $event)"
    @expanded-change="emit('expandedChange', $event)"
  >
    <template #icon><slot name="icon">＋</slot></template>
  </ExpandableButton>
  <ExpandableChip
    v-else
    :label="props.label"
    :action-label="props.actionLabel ?? `Remove ${props.label}`"
    :collapse-on-action="props.collapseOnAction"
    :expanded="props.expanded"
    :default-expanded="props.defaultExpanded"
    :disabled="props.disabled"
    @action="emit('remove', $event)"
    @update:expanded="emit('update:expanded', $event)"
    @expanded-change="emit('expandedChange', $event)"
  >
    <template #actionIcon><slot name="actionIcon">×</slot></template>
  </ExpandableChip>
</template>

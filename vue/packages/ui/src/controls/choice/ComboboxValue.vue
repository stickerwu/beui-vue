<script setup lang="ts">
import { computed } from 'vue'
import { useComboContext } from './combo-context'
import './combo.css'

/** The selected option's label (or the placeholder), for layouts that show it outside the input. */
defineProps<{
  placeholder?: string
}>()
defineSlots<{
  /** Replaces the label. */
  default?(props: { value: string | undefined; label: string | undefined }): unknown
  /** Placeholder content when nothing is selected. */
  placeholder?(): unknown
}>()
const context = useComboContext('ComboboxValue')
const label = computed(() => context.labelFor(context.value.value))
</script>

<template>
  <span class="be-combo-value" :class="{ 'is-empty': context.value.value === undefined }">
    <slot :value="context.value.value" :label="label">
      <template v-if="label !== undefined">{{ label }}</template>
      <slot v-else-if="$slots.placeholder" name="placeholder" />
      <template v-else>{{ placeholder ?? context.t('valuePlaceholder') }}</template>
    </slot>
  </span>
</template>

<script setup lang="ts">
import { useComboContext } from './combo-context'
import './combo.css'

/** The scrolling listbox inside the panel. Shared by `ComboboxList` and `MultiSelectList`. */
defineProps<{
  /** Accessible name of the list. */
  ariaLabel?: string
}>()
defineSlots<{ default?(): unknown }>()
const context = useComboContext('ComboboxList')
</script>

<template>
  <div :id="context.listId" role="listbox" class="be-combo-list" :aria-label="ariaLabel ?? context.t('listLabel')" :aria-multiselectable="context.multiple ? 'true' : undefined">
    <slot />
  </div>
</template>

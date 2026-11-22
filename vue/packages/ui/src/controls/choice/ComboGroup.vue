<script setup lang="ts">
import { provide, useId } from 'vue'
import { COMBO_GROUP_KEY, useComboContext } from './combo-context'
import './combo.css'

/** A set of related options under one `ComboboxLabel`. Hides itself when the filter leaves none of its options. */
defineSlots<{ default?(): unknown }>()
const context = useComboContext('ComboboxGroup')
const groupId = useId()
provide(COMBO_GROUP_KEY, groupId)
</script>

<template>
  <fieldset :hidden="!context.hasVisibleItems(groupId)" class="be-combo-group"><slot /></fieldset>
</template>

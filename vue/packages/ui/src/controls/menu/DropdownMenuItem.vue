<script setup lang="ts">
import MenuItemBase from './MenuItemBase.vue'

withDefaults(defineProps<{
  disabled?: boolean
  /** Close the whole menu after selecting. Default true. */
  closeOnSelect?: boolean
  tone?: 'default' | 'destructive'
  /** Indent to line up with checkbox and radio rows. */
  inset?: boolean
  /** Text matched by typeahead when the label is not plain text. */
  textValue?: string
}>(), { closeOnSelect: true, tone: 'default' })
const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <MenuItemBase :disabled="disabled" :close-on-select="closeOnSelect" :tone="tone" :inset="inset" :text-value="textValue" @select="emit('select')"><slot /></MenuItemBase>
</template>

<script setup lang="ts">
import type { VNode } from 'vue'

// A declarative part: `FileTree` reads it from its default slot and turns it into one
// flattened, keyboard-navigable collection, so it renders nothing on its own.
// `class` is read the same way and lands on the row.
defineOptions({ inheritAttrs: false })
defineProps<{
  value: string
  name: string
  disabled?: boolean
}>()
defineSlots<{
  /** Icon of the row; replaces the default file icon. */
  icon?: () => VNode[]
}>()
</script>

<template>
  <div hidden />
</template>

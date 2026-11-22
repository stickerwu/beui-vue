<script setup lang="ts">
defineProps<{
  /** Keep an empty avatar slot so grouped messages remain aligned. */
  placeholder?: boolean
  className?: string
}>()
</script>

<template>
  <div data-slot="message-avatar" class="be-message-avatar" :class="className" :aria-hidden="placeholder || undefined"><slot /></div>
</template>

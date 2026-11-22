<script setup lang="ts">
/** Vertical stack of `Message` rows. */
withDefaults(defineProps<{
  spacing?: 'compact' | 'default'
  className?: string
}>(), { spacing: 'compact' })
</script>

<template>
  <div data-slot="message-group" class="be-message-group" :class="className" :data-spacing="spacing"><slot /></div>
</template>

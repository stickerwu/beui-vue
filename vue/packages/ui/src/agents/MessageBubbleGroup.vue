<script setup lang="ts">
/** Vertical stack of `MessageBubble` rows inside one `MessageContent`. */
withDefaults(defineProps<{
  spacing?: 'compact' | 'default'
  className?: string
}>(), { spacing: 'compact' })
</script>

<template>
  <div data-slot="message-bubble-group" class="be-message-bubble-group" :class="className" :data-spacing="spacing"><slot /></div>
</template>

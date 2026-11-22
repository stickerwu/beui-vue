<script setup lang="ts">
/** Centered divider chip between messages, such as a date or a system notice. */
defineProps<{ className?: string }>()
</script>

<template>
  <div data-slot="message-marker" class="be-message-marker" :class="className"><slot /></div>
</template>

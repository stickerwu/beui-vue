<script setup lang="ts">
import { messageMessages } from './Message.vue'

/** Three-dot "responding" indicator. The dots are decorative; `label` is read by screen readers. */
defineProps<{
  label?: string
  className?: string
}>()
</script>

<template>
  <span data-slot="message-typing" class="be-message-typing" :class="className">
    <span class="be-sr-only">{{ label ?? messageMessages.typing }}</span>
    <!-- Three dots on a staggered loop; the CSS media query stills them. -->
    <span v-for="index in 3" :key="index" aria-hidden="true" :style="{ animationDelay: `${(index - 1) * 0.14}s` }" />
  </span>
</template>

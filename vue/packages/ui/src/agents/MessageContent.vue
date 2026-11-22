<script setup lang="ts">
import { computed, inject } from 'vue'
import { sideKey } from './shared'

/** Column that holds a message's header, bubbles and footer; aligns to the sender's side. */
defineProps<{ className?: string }>()
const side = inject(sideKey, undefined)
const align = computed(() => side?.value ?? 'start')
</script>

<template>
  <div data-slot="message-content" class="be-message-content" :class="className" :data-align="align"><slot /></div>
</template>

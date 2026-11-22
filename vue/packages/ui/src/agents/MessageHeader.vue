<script setup lang="ts">
import { computed, inject } from 'vue'
import { sideKey } from './shared'

/** Name and timestamp row above the bubbles. */
defineProps<{ className?: string }>()
const side = inject(sideKey, undefined)
const align = computed(() => side?.value ?? 'start')
</script>

<template>
  <div data-slot="message-header" class="be-message-header" :class="className" :data-align="align"><slot /></div>
</template>

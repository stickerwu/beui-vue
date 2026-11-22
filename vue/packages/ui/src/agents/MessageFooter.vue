<script setup lang="ts">
import { computed, inject } from 'vue'
import { sideKey } from './shared'

/** Delivery status and actions below the bubbles. */
defineProps<{ className?: string }>()
const side = inject(sideKey, undefined)
const align = computed(() => side?.value ?? 'start')
</script>

<template>
  <div data-slot="message-footer" class="be-message-footer" :class="className" :data-align="align"><slot /></div>
</template>

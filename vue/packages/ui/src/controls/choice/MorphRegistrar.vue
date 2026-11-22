<script setup lang="ts">
import { provide } from 'vue'
import { morphRegistrarKey } from './select-context'

// Marks the hidden copy of the items that only keeps their labels registered.
provide(morphRegistrarKey, true)
</script>

<template>
  <slot />
</template>

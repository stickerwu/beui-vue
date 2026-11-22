<script setup lang="ts">
withDefaults(defineProps<{
  /** Heading level, when the card starts a section. Default "div". */
  as?: 'div' | 'h2' | 'h3' | 'h4'
}>(), { as: 'div' })
</script>

<template>
  <component :is="as" class="be-card-title" data-slot="card-title"><slot /></component>
</template>

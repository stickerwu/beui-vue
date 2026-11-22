<script setup lang="ts">
/** The row body beside the handle. */
defineSlots<{ default?: () => unknown }>()
</script>

<template>
  <div class="be-sortable-list-content"><slot /></div>
</template>

<style>
.be-sortable-list-content { min-width: 0; flex: 1; }
</style>

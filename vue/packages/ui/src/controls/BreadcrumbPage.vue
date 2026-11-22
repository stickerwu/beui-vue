<script setup lang="ts">
/** The current page: not a link, marked `aria-current="page"`. */
defineSlots<{ default?: () => unknown }>()
</script>

<template>
  <span class="be-crumb-page" aria-current="page"><slot /></span>
</template>

<style>
.be-crumb-page { position: relative; isolation: isolate; display: inline-flex; box-sizing: border-box; min-height: 2rem; min-width: 0; align-items: center; gap: .375rem; padding: 0 .5rem; border-radius: .375rem; color: var(--beui-foreground); font-weight: 500; overflow-wrap: anywhere; }
.be-crumb-page:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
</style>

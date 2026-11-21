<script setup lang="ts">
import { MagneticButton } from 'beui-vue'
</script>

<template>
  <div class="row">
    <MagneticButton variant="primary" size="md" :strength="0.35">Hover me <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg></MagneticButton>
    <MagneticButton variant="secondary" size="md" :strength="0.25">Subtle pull</MagneticButton>
    <MagneticButton variant="outline" size="md" :strength="0.5">Strong pull</MagneticButton>
  </div>
</template>

<style scoped>
.row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 1rem; }
.row svg { width: 1rem; height: 1rem; flex: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
</style>

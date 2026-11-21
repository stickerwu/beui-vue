<script setup lang="ts">
import { ButtonBase } from 'beui-vue'
</script>

<template>
  <div class="button-demo">
    <div class="row">
      <ButtonBase variant="primary" size="md">Continue <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg></ButtonBase>
      <ButtonBase variant="secondary" size="md"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></svg>Download</ButtonBase>
      <ButtonBase variant="outline" size="md">Outline</ButtonBase>
      <ButtonBase variant="ghost" size="md">Ghost</ButtonBase>
    </div>
    <div class="row">
      <ButtonBase variant="primary" size="sm">Small</ButtonBase>
      <ButtonBase variant="primary" size="md">Medium</ButtonBase>
      <ButtonBase variant="primary" size="lg">Large</ButtonBase>
      <ButtonBase variant="secondary" size="icon" aria-label="Delete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" /></svg></ButtonBase>
    </div>
    <div class="row">
      <ButtonBase variant="primary" size="md" ripple>Ripple</ButtonBase>
      <ButtonBase variant="outline" size="md" ripple>Tap me</ButtonBase>
    </div>
  </div>
</template>

<style scoped>
.button-demo { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
.row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .75rem; }
.row svg { width: 1rem; height: 1rem; flex: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
</style>

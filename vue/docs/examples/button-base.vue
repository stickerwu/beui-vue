<script setup lang="ts">
import { ButtonBase } from 'beui-vue'
import { shallowRef } from 'vue'

const message = shallowRef('')
function report(label: string) { message.value = `${label} pressed` }
</script>

<template>
  <div class="button-demo">
    <div class="row">
      <ButtonBase @click="report('Continue')">Continue <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></ButtonBase>
      <ButtonBase variant="secondary" @click="report('Download')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/></svg> Download</ButtonBase>
      <ButtonBase variant="outline" @click="report('Outline')">Outline</ButtonBase>
      <ButtonBase variant="ghost" @click="report('Ghost')">Ghost</ButtonBase>
    </div>
    <div class="row">
      <ButtonBase size="sm" @click="report('Small')">Small</ButtonBase>
      <ButtonBase @click="report('Medium')">Medium</ButtonBase>
      <ButtonBase size="lg" @click="report('Large')">Large</ButtonBase>
      <ButtonBase size="icon" variant="secondary" aria-label="Delete" @click="report('Delete')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3m3 0-1 15H7L6 6m4 4v7m4-7v7"/></svg></ButtonBase>
    </div>
    <div class="row">
      <ButtonBase ripple @click="report('Ripple')">Ripple</ButtonBase>
      <ButtonBase variant="outline" ripple @click="report('Tap me')">Tap me</ButtonBase>
      <ButtonBase disabled variant="ghost">Disabled</ButtonBase>
    </div>
    <output class="feedback" role="status">{{ message }}</output>
  </div>
</template>

<style scoped>
.button-demo { display: grid; justify-items: center; gap: 1.5rem; width: 100%; }
.row { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .75rem; }
.row svg { width: 1rem; height: 1rem; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; fill: none; }
.feedback { min-height: 1em; color: var(--beui-muted-foreground); font-size: .75rem; }
</style>

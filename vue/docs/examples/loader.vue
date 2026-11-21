<script setup lang="ts">
import { Loader } from 'beui-vue'

const VARIANTS = [
  { variant: 'spinner', label: 'Spinner' },
  { variant: 'dots', label: 'Dots' },
  { variant: 'bars', label: 'Bars' },
  { variant: 'dot-matrix', label: 'Dot Matrix' },
  { variant: 'dither', label: 'Dither' },
  { variant: 'morph', label: 'Morph' },
  { variant: 'comet', label: 'Comet' },
  { variant: 'metaballs', label: 'Metaballs' },
  { variant: 'newton', label: 'Newton' },
  { variant: 'helix', label: 'Helix' },
  { variant: 'scramble', label: 'Scramble' },
  { variant: 'percent', label: 'Percent' },
  { variant: 'ascii', label: 'ASCII' },
  { variant: 'ascii-line', label: 'ASCII Line' },
  { variant: 'ascii-braille', label: 'ASCII Braille' },
  { variant: 'ascii-blocks', label: 'ASCII Blocks' },
  { variant: 'ascii-bounce', label: 'ASCII Bounce' },
] as const
</script>

<template>
  <div class="loaders">
    <div v-for="item in VARIANTS" :key="item.variant" class="cell">
      <Loader :variant="item.variant" :size="36" />
      <span class="label">{{ item.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.loaders { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 2rem; padding: 2rem; width: 100%; box-sizing: border-box; }
.cell { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.cell .label { font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
</style>

<script setup lang="ts">
import { ActionSwapBlurButton } from 'beui-vue'

const textItems = [{ id: 'copy', label: 'Copy' }, { id: 'copied', label: 'Copied' }]
const iconItems = [
  { id: 'light', label: 'Light', ariaLabel: 'Use light theme' },
  { id: 'dark', label: 'Dark', ariaLabel: 'Use dark theme' },
]
const ctaItems = [
  { id: 'copy', label: 'Copy link', ariaLabel: 'Copy link' },
  { id: 'copied', label: 'Copied', ariaLabel: 'Copied' },
]
</script>

<template>
  <div class="swap-demo">
    <ActionSwapBlurButton :items="textItems" variant="secondary" />
    <ActionSwapBlurButton :items="iconItems" variant="outline" size="icon" icon-only>
      <template #icon="{ item }"><svg v-if="item.id === 'light'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg><svg v-else viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg></template>
    </ActionSwapBlurButton>
    <ActionSwapBlurButton :items="ctaItems" variant="primary">
      <template #icon="{ item }"><svg v-if="item.id === 'copy'" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg><svg v-else viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg></template>
    </ActionSwapBlurButton>
  </div>
</template>

<style scoped>
.swap-demo { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .75rem; }
</style>

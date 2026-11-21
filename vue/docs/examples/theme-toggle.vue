<script setup lang="ts">
import { ThemeToggle } from 'beui-vue'

const variants = [
  { variant: 'rectangle', label: 'Rectangle' },
  { variant: 'circle', label: 'Circle' },
  { variant: 'circle-blur', label: 'Circle blur' },
  { variant: 'blinds', label: 'Blinds' },
] as const
</script>

<template>
  <div class="theme-demo">
    <div v-for="item in variants" :key="item.variant" class="theme-item">
      <ThemeToggle :variant="item.variant" start="bottom-up" class-name="theme-chip" icon-class-name="theme-icon" />
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.theme-demo { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; gap: 1.25rem; }
.theme-item { display: flex; flex-direction: column; align-items: center; gap: .5rem; }
.theme-item span { font-size: 11px; line-height: 1rem; color: var(--beui-muted-foreground); }
:deep(.theme-chip) { border-radius: .75rem; border: 1px solid var(--beui-border); background: var(--beui-background); padding: .625rem; }
:deep(.theme-icon) { width: 1.25rem; height: 1.25rem; }
</style>

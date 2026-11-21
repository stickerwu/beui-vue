<script setup lang="ts">
import { ActionSwap } from 'beui-vue'

const items = [
  { id: 'copy', label: 'Copy link', ariaLabel: 'Copy link' },
  { id: 'copied', label: 'Copied!', ariaLabel: 'Copied' },
]
</script>

<template>
  <div class="swap-demo">
    <ActionSwap :items="items" animation="cascade" variant="primary">
      <template #icon="{ item }"><svg v-if="item.id === 'copy'" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg><svg v-else viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg></template>
    </ActionSwap>
  </div>
</template>

<style scoped>
.swap-demo { display: flex; width: 100%; justify-content: center; }
</style>

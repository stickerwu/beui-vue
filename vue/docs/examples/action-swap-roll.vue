<script setup lang="ts">
import { ActionSwap } from 'beui-vue'

const textItems = [{ id: 'idle', label: 'Save' }, { id: 'done', label: 'Saved' }]
const iconItems = [
  { id: 'light', label: 'Light', ariaLabel: 'Use light theme' },
  { id: 'dark', label: 'Dark', ariaLabel: 'Use dark theme' },
]
const ctaItems = [
  { id: 'send', label: 'Send invite', ariaLabel: 'Send invite' },
  { id: 'sent', label: 'Invite sent', ariaLabel: 'Invite sent' },
]
</script>

<template>
  <div class="swap-demo">
    <ActionSwap :items="textItems" animation="roll" variant="secondary" />
    <ActionSwap :items="iconItems" animation="roll" variant="outline" size="icon" icon-only>
      <template #icon="{ item }"><svg v-if="item.id === 'light'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg><svg v-else viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg></template>
    </ActionSwap>
    <ActionSwap :items="ctaItems" animation="roll" variant="primary">
      <template #icon="{ item }"><svg v-if="item.id === 'send'" viewBox="0 0 24 24"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></svg><svg v-else viewBox="0 0 24 24"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /><path d="M20 3v4M22 5h-4M4 17v2M5 18H3" /></svg></template>
    </ActionSwap>
  </div>
</template>

<style scoped>
.swap-demo { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .75rem; }
</style>

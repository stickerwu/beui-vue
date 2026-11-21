<script setup lang="ts">
import { h } from 'vue'
import { NotificationStack } from 'beui-vue'

const retry = h('span', { class: 'notify-retry' }, [
  h('svg', { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, [
    h('path', { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8' }),
    h('path', { d: 'M21 3v5h-5' }),
  ]),
  '2',
])

const notifications = [
  { id: 'import-failed', title: 'Orders import failed', description: '42s · TimeoutError at Step 2', trailing: retry },
  { id: 'sla-breach', title: 'SLA breach', description: '2m 11s · Data enrichment' },
  { id: 'sync-fixed', title: 'Product sync auto-fixed', description: '5m · 404 on GET /products' },
]
</script>

<template>
  <div class="notify-stage">
    <NotificationStack :items="notifications" />
  </div>
</template>

<style scoped>
.notify-stage { --notify-amber: #f59e0b; display: flex; width: 100%; align-items: center; justify-content: center; padding: 13rem 0 1.5rem; }
:global(.dark .notify-stage) { --notify-amber: #fbbf24; }
.notify-stage :deep(.notify-retry) { display: inline-flex; align-items: center; gap: .25rem; color: var(--notify-amber); }
</style>

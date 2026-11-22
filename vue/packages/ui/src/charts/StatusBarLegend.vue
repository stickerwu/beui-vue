<script setup lang="ts">
import { useStatusBar } from './status-bar-context'

defineSlots<{
  /** Replaces the status items. */
  default?(): unknown
}>()
const { showCounts = false } = defineProps<{ showCounts?: boolean }>()
const { statuses, rows, t } = useStatusBar()
</script>

<template>
  <ul class="legend" :aria-label="t('legend')" data-slot="status-bar-legend">
    <slot>
      <li v-for="status in statuses" :key="status.id"><span class="key" aria-hidden="true" :style="{ backgroundColor: status.color }" /><span>{{ status.label }}</span>
        <span v-if="showCounts" class="count">({{ rows.filter(item => item.status.id === status.id).length }})</span></li>
    </slot>
  </ul>
</template>

<style scoped>
.legend { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin: 0; padding: 0; list-style: none; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.legend li { display: flex; align-items: center; gap: 6px; margin: 0; font-size: inherit; line-height: inherit; color: inherit; }
.key { width: 6px; height: 12px; border-radius: 9999px; }
.count { font-variant-numeric: tabular-nums; }
</style>

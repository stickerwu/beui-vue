<script setup lang="ts">
import { useTreemap } from './treemap-context'

const { showValues = false } = defineProps<{ showValues?: boolean }>()
const { model, formatValue, t } = useTreemap()
</script>

<template>
  <ul v-if="model.nodes.length" :aria-label="t('legend')" class="legend">
    <li v-for="node in model.nodes" :key="node.id"><span aria-hidden="true" class="dot" :style="{ backgroundColor: node.color }" /><span class="muted">{{ node.label }}</span><span v-if="showValues" class="mono">{{ formatValue(node.value) }}</span></li>
  </ul>
</template>

<style scoped>
.legend { display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 0; padding: 0; list-style: none; font-size: 12px; line-height: 16px; }
.legend li { display: inline-flex; align-items: center; gap: 6px; }
.dot { flex: none; width: 6px; height: 6px; border-radius: 50%; }
.muted { color: var(--beui-muted-foreground); }
.mono { font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-variant-numeric: tabular-nums; }
</style>

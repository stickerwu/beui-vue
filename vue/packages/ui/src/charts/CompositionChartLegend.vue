<script setup lang="ts">
import { useCompositionChart } from './composition-context'

const { column, highlight, pinned, setPinned, setHovered, setFocused, canHover, formatValue, t } = useCompositionChart()
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') { setPinned(null); setHovered(null); setFocused(null) }
}
</script>

<template>
  <div v-if="column" class="legend" data-slot="composition-chart-legend">
    <button v-for="row in column.segments" :key="row.id" type="button" :aria-label="t('highlight', { name: row.name })" :aria-pressed="pinned === row.id"
      :class="{ pinned: pinned === row.id, dim: highlight && highlight !== row.id }"
      @click="setPinned(pinned === row.id ? null : row.id)" @pointerenter="canHover && (setHovered(row.id))" @pointerleave="setHovered(null)"
      @focus="setFocused(row.id)" @blur="setFocused(null)" @keydown="onKeydown">
      <span class="swatch" aria-hidden="true" :style="{ backgroundColor: row.color }" />
      <span class="text"><span class="name">{{ row.name }}</span><span class="value mono" :title="row.value === null ? t('missingValue') : formatValue(row.value)">{{ column.valid ? `${row.share.toFixed(1)}%` : '—' }}</span></span>
    </button>
  </div>
</template>

<style scoped>
.legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; min-width: 0; }
@container (min-width: 480px) { .legend { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@container (min-width: 900px) { .legend { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
.legend button { display: flex; align-items: center; gap: 10px; min-width: 0; min-height: 48px; padding: 6px 8px; border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; font-size: 12px; line-height: 16px; text-align: left; cursor: pointer; transition: opacity .15s; }
.legend button.pinned { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
.legend button.dim { opacity: .4; }
.legend button:focus-visible { outline: 2px solid color-mix(in srgb, var(--beui-foreground) 12%, transparent); outline-offset: 2px; }
.swatch { flex: none; width: 4px; height: 24px; border-radius: 9999px; }
.text { display: grid; gap: 2px; min-width: 0; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--beui-muted-foreground); }
.value { font-variant-numeric: tabular-nums; }
.mono { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); }
</style>

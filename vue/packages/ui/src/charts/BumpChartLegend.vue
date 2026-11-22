<script setup lang="ts">
import { useBumpChart } from './bump-context'

const { rows, pinned, highlighted, select, hovered, focused, canHover, escape, t, setHovered, setFocused } = useBumpChart()
const gainTitle = (gain: number | null) => gain == null ? t('changeUnavailable') : gain === 0 ? t('unchanged') : Math.abs(gain) === 1 ? t(gain > 0 ? 'upOne' : 'downOne') : t(gain > 0 ? 'up' : 'down', { count: Math.abs(gain) })
</script>

<template>
  <div class="legend" data-slot="bump-chart-legend">
    <button v-for="row in rows" :key="row.id" type="button" :aria-label="t('highlight', { name: row.name })" :aria-pressed="pinned === row.id"
      :class="{ dim: highlighted && highlighted !== row.id, pinned: pinned === row.id }"
      @click="select(pinned === row.id ? null : row.id)" @pointerenter="canHover && (setHovered(row.id))" @pointerleave="setHovered(null)" @focus="setFocused(row.id)" @blur="setFocused(null)" @keydown.esc="escape">
      <span class="swatch" aria-hidden="true" :style="{ backgroundColor: row.color }" />
      <span class="name">{{ row.name }}</span>
      <span class="last">{{ row.ranks.at(-1) == null ? '—' : `#${row.ranks.at(-1)}` }}</span>
      <span class="gain" :title="gainTitle(row.ranks[0] != null && row.ranks.at(-1) != null ? row.ranks[0]! - row.ranks.at(-1)! : null)">{{
        row.ranks[0] == null || row.ranks.at(-1) == null || row.ranks[0] === row.ranks.at(-1) ? '—' : `${row.ranks[0]! - row.ranks.at(-1)! > 0 ? '↑' : '↓'}${Math.abs(row.ranks[0]! - row.ranks.at(-1)!)}` }}</span>
    </button>
  </div>
</template>

<style scoped>
.legend { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 20px; }
@media (min-width: 640px) { .legend { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.legend button { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 10px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--beui-foreground); font: inherit; font-size: 12px; line-height: 16px; text-align: left; cursor: pointer; transition: opacity .15s; }
.legend button:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.legend button.dim { opacity: .35; }
.legend button.pinned { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
.swatch { flex: none; width: 8px; height: 8px; border-radius: 50%; }
.name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 400; }
.last { margin-left: auto; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.gain { min-width: 20px; text-align: right; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 10px; line-height: calc(4 / 3); font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
</style>

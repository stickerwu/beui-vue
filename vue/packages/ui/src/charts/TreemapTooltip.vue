<script setup lang="ts">
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import type { TreemapItem } from './models/treemap'
import { useTreemap } from './treemap-context'

defineSlots<{
  /** Replaces the default content. Receives the inspected item. */
  default?(props: { item: TreemapItem }): unknown
}>()
const { side = 'top' } = defineProps<{ side?: 'top' | 'right' | 'bottom' | 'left' }>()
const { active, plot, size, tiles, tooltipId, tooltipOpen, formatValue, setTooltipOpen } = useTreemap()
</script>

<template>
  <ChartTip v-if="tiles.length" :id="tooltipId" :anchor="plot" :side="side"
    :anchor-point="{ x: active ? (active.x + active.width / 2) / size.width : 0.5, y: active ? (active.y + active.height / 2) / size.height : 0.5 }"
    :open="tooltipOpen && active !== null" @dismiss="setTooltipOpen(false)">
    <slot v-if="active" :item="active">
      <span class="tip">
        <span v-if="active.path.length > 1" class="muted">{{ active.path.slice(0, -1).join(' / ') }}</span>
        <span class="title">{{ active.label }}</span>
        <span class="figures"><NumberTicker :value="active.value" :format="() => formatValue(active!.value)" :start-on-view="false" :duration="0.2" :stagger="0" />
          <span class="muted">·</span><NumberTicker class="muted" :value="active.share * 100" :format="() => `${(active!.share * 100).toFixed(1)}%`" :start-on-view="false" :duration="0.2" :stagger="0" /></span>
        <span v-if="active.description" class="muted">{{ active.description }}</span>
      </span>
    </slot>
  </ChartTip>
</template>

<style scoped>
.tip { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.muted { color: var(--beui-muted-foreground); }
.title { font-weight: 500; }
.figures { display: inline-flex; align-items: center; gap: 8px; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-variant-numeric: tabular-nums; }
</style>

<script setup lang="ts">
import ChartTip from './ChartTip.vue'
import { useStatusBar, type StatusBarTooltipData } from './status-bar-context'

defineSlots<{
  /** Replaces the default content. Receives the inspected period, its status and its index. */
  default?(props: StatusBarTooltipData): unknown
}>()
const { side = 'top' } = defineProps<{ side?: 'top' | 'right' | 'bottom' | 'left' }>()
const { active, activeIndex, rows, plot, tooltipId, tooltipOpen, setTooltipOpen } = useStatusBar()
</script>

<template>
  <ChartTip :id="tooltipId" :open="tooltipOpen && active !== null" :anchor="plot" :anchor-point="{ x: (Math.max(activeIndex, 0) + 0.5) / Math.max(rows.length, 1), y: 0.1 }" :side="side" @dismiss="setTooltipOpen(false)">
    <slot v-if="active" :datum="active.datum" :status="active.status" :index="activeIndex">
      <span class="tip">
        <span class="tip-label">{{ active.datum.label }}</span>
        <span class="tip-status"><span class="tip-dot" aria-hidden="true" :style="{ backgroundColor: active.status.color }" />{{ active.status.label }}</span>
        <span v-if="active.datum.description" class="tip-label">{{ active.datum.description }}</span>
      </span>
    </slot>
  </ChartTip>
</template>

<style scoped>
.tip { display: flex; flex-direction: column; gap: 4px; text-align: left; }
.tip-label { color: var(--beui-muted-foreground); }
.tip-status { display: flex; align-items: center; gap: 8px; font-weight: 500; }
.tip-dot { flex: none; width: 6px; height: 6px; border-radius: 9999px; }
</style>

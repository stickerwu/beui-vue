<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import ChartTip from './ChartTip.vue'
import { PTF_H as H, PTF_W as W, ptfInk, usePriceTargetFan, type PriceTargetFanOverlay } from './price-target-fan-context'

defineSlots<{
  /** Custom card content for the hovered target or the scrubbed point. */
  default?(props: { overlay: PriceTargetFanOverlay }): unknown
}>()
const { svg, tooltipId, overlay } = usePriceTargetFan()

// dismissed (Escape, or a tap elsewhere) until the overlay moves to another point
const dismissed = shallowRef<PriceTargetFanOverlay | null>(null)
const open = computed(() => overlay.value !== null && dismissed.value !== overlay.value)
const dismiss = () => { dismissed.value = overlay.value }
const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && open.value) dismiss() }
const onDown = (event: PointerEvent) => { if (open.value && event.pointerType === 'touch' && !svg.value?.contains(event.target as Node)) dismiss() }
onMounted(() => { document.addEventListener('keydown', onKey); document.addEventListener('pointerdown', onDown, true) })
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown, true) })
</script>

<template>
  <ChartTip :id="tooltipId" :open="open" :anchor="svg" :anchor-point="{ x: (overlay?.px ?? 0) / W, y: (overlay?.py ?? 0) / H }" :follow-cursor="false" side="top" max-width="148px" @dismiss="dismiss">
    <slot v-if="overlay" :overlay="overlay">
      <span class="ptf-tip">
        <span class="title">{{ overlay.title }}</span>
        <span class="metrics"><span v-for="metric in overlay.metrics" :key="metric.label" class="metric"><span class="k">{{ metric.label }}</span><span class="v">{{ metric.value }}</span></span></span>
        <span v-if="overlay.accent" class="metric accent"><span class="k">{{ overlay.accent.label }}</span><span class="v" :style="{ color: ptfInk(overlay.accent.color) }">{{ overlay.accent.value }}</span></span>
      </span>
    </slot>
  </ChartTip>
</template>

<!-- Tooltip content is teleported to the body, so its rules cannot be scoped. -->
<style>
.chart-tip .ptf-tip { display: block; width: 148px; max-width: 100%; padding: 2px 0; font-size: 12px; line-height: calc(4 / 3); }
.chart-tip .ptf-tip .title { display: block; font-size: 10px; color: var(--beui-muted-foreground); }
.chart-tip .ptf-tip .metrics { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.chart-tip .ptf-tip .metric { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; }
.chart-tip .ptf-tip .metric .k { font-weight: 500; color: var(--beui-foreground); }
.chart-tip .ptf-tip .metric .v { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-variant-numeric: tabular-nums; color: var(--beui-foreground); }
.chart-tip .ptf-tip .metric.accent { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--beui-border); }
</style>

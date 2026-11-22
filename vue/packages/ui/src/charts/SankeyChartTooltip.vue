<script setup lang="ts">
import { computed } from 'vue'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { useSankeyChart, type SankeyActive } from './sankey-context'

// Flows listed per direction in a node's tooltip.
const MAX_FLOWS = 4

defineSlots<{
  /** Custom content for the highlighted node or flow. */
  default?(props: { active: SankeyActive }): unknown
}>()
const { side = 'top' } = defineProps<{ side?: 'top' | 'right' | 'bottom' | 'left' }>()
const { active, nodes, links, size, plot, tooltipId, open, formatValue, percent, t, setOpen } = useSankeyChart()
// Anchors keyboard focus to the top of the node, so the tooltip clears its label, or to the flow's midpoint; the pointer takes over while it moves.
const anchorPoint = computed(() => {
  const current = active.value
  const { width, height } = size.value
  const at = current?.type === 'node' ? { x: (current.node.x0 + current.node.x1) / 2, y: current.node.y0 }
    : current?.type === 'link' ? { x: (current.link.x0 + current.link.x1) / 2, y: (current.link.y0 + current.link.y1) / 2 } : { x: width / 2, y: height / 2 }
  return { x: at.x / width, y: at.y / height }
})
const linkShare = computed(() => active.value?.type === 'link' ? t('linkShare', { source: active.value.link.source.label, share: '\u0000' }).split('\u0000') : [])
function flowsOf(direction: 'in' | 'out') {
  const node = active.value?.type === 'node' ? active.value.node : null
  if (!node) return []
  return links.value.filter(link => direction === 'in' ? link.target === node : link.source === node).sort((a, b) => b.value - a.value)
}
</script>

<template>
  <ChartTip v-if="nodes.length" :id="tooltipId" :anchor="plot" :anchor-point="anchorPoint" :side="side" :open="open && active !== null" @dismiss="setOpen(false)">
    <slot v-if="active" :active="active">
      <span v-if="active.type === 'node'" class="tip">
        <span class="title"><span aria-hidden="true" class="dot" :style="{ backgroundColor: active.node.color }" />{{ active.node.label }}</span>
        <span class="figures"><NumberTicker :value="active.node.value" :format="() => formatValue(active!.type === 'node' ? active!.node.value : 0)" :start-on-view="false" :duration="0.2" :stagger="0" /></span>
        <span v-if="active.node.inValue && active.node.outValue" class="figures muted">{{ t('tooltipFlows', { in: formatValue(active.node.inValue), out: formatValue(active.node.outValue) }) }}</span>
        <template v-for="direction in (['in', 'out'] as const)" :key="direction">
          <span v-if="flowsOf(direction).length" class="group">
            <span class="muted">{{ direction === 'in' ? t('from') : t('to') }}</span>
            <span v-for="link in flowsOf(direction).slice(0, MAX_FLOWS)" :key="link.id" class="row"><span class="truncate">{{ direction === 'in' ? link.source.label : link.target.label }}</span><span class="figures muted">{{ formatValue(link.value) }}</span></span>
            <span v-if="flowsOf(direction).length > MAX_FLOWS" class="muted">{{ t('more', { count: flowsOf(direction).length - MAX_FLOWS }) }}</span>
          </span>
        </template>
        <span v-if="active.node.description" class="muted">{{ active.node.description }}</span>
      </span>
      <span v-else class="tip">
        <span class="title">{{ active.link.source.label }} → {{ active.link.target.label }}</span>
        <span class="figures"><NumberTicker :value="active.link.value" :format="() => formatValue(active!.type === 'link' ? active!.link.value : 0)" :start-on-view="false" :duration="0.2" :stagger="0" />
          <span class="muted">·</span><span class="muted">{{ linkShare[0] }}<NumberTicker :value="active.link.share" :format="() => percent(active!.type === 'link' ? active!.link.share : 0)" :start-on-view="false" :duration="0.2" :stagger="0" />{{ linkShare[1] }}</span></span>
      </span>
    </slot>
  </ChartTip>
</template>

<style scoped>
.tip { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.title { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.figures { display: inline-flex; align-items: center; gap: 8px; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-variant-numeric: tabular-nums; }
.muted { color: var(--beui-muted-foreground); }
.group { display: flex; flex-direction: column; gap: 2px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>

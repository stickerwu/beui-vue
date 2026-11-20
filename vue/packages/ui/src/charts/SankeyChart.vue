<script setup lang="ts">
import { computed, shallowRef, useId, onMounted, onBeforeUnmount, useTemplateRef } from 'vue'
import { cleanSankey, layoutSankey, SANKEY_COLORS, type SankeyLink, type SankeyNode } from './models/sankey-chart'

const props = withDefaults(defineProps<{
  nodes: readonly SankeyNode[]; links: readonly SankeyLink[]; label?: string; formatValue?: (value: number) => string; colors?: readonly string[]
  nodeWidth?: number; nodePadding?: number; activeId?: string | null; defaultActiveId?: string | null; labels?: Partial<Record<string, string>>
}>(), { colors: () => SANKEY_COLORS, nodeWidth: 16, nodePadding: 24, formatValue: (value: number) => value.toLocaleString('en-US') })
const data = computed(() => cleanSankey(props.nodes, props.links))
const host = useTemplateRef('host')
const width = shallowRef(560)
const height = 260
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!host.value) return
  function measure() { if (host.value) width.value = Math.max(40, host.value.clientWidth) }
  measure(); observer = new ResizeObserver(measure); observer.observe(host.value)
})
onBeforeUnmount(() => observer?.disconnect())
const model = computed(() => layoutSankey(data.value, { width: width.value, height, colors: props.colors.length ? props.colors : SANKEY_COLORS,
  nodeWidth: Math.max(2, Math.min(width.value / 5, props.nodeWidth)), nodePadding: Math.max(0, props.nodePadding) }))
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()
const local = shallowRef(props.defaultActiveId ?? null)
const open = shallowRef(false)
const id = useId()
const selection = computed(() => props.activeId === undefined ? local.value : props.activeId)
const node = computed(() => model.value.nodes.find(item => item.id === selection.value))
const link = computed(() => model.value.links.find(item => item.id === selection.value))
function inspect(next: string) {
  if (selection.value !== next) { if (props.activeId === undefined) local.value = next; emit('update:activeId', next); emit('activeChange', next) }
  open.value = true
}
function connected(key: string) { return !open.value || key === node.value?.id || link.value?.source.id === key || link.value?.target.id === key }
</script>

<template>
  <section data-slot="sankey-chart" :aria-label="label ?? labels?.label ?? 'Sankey chart'" class="sankey">
    <div ref="host" class="plot" @pointerleave="open = false">
      <svg :viewBox="`0 0 ${width} ${height}`" :height="height" width="100%">
        <defs><linearGradient v-for="(edge, index) in model.links" :id="`${id}-edge-${index}`" :key="edge.id"><stop :stop-color="edge.source.color" /><stop offset="1" :stop-color="edge.target.color" /></linearGradient></defs>
        <path v-for="(edge, index) in model.links" :key="edge.id" :d="edge.path" fill="none" :stroke="`url(#${id}-edge-${index})`" :stroke-width="edge.width"
          :opacity="!open ? .42 : edge.id === selection || edge.source.id === node?.id || edge.target.id === node?.id ? .8 : .17" tabindex="0" role="button"
          :aria-label="`${edge.source.label} to ${edge.target.label}, ${formatValue(edge.value)}`" @focus="inspect(edge.id)" @blur="open = false" @click="inspect(edge.id)" @keydown.enter.prevent="inspect(edge.id)" @keydown.space.prevent="inspect(edge.id)" @keydown.esc="open = false" @pointerenter="$event.pointerType !== 'touch' && inspect(edge.id)" />
        <g v-for="item in model.nodes" :key="item.id" :opacity="connected(item.id) ? 1 : .55" tabindex="0" role="button" :aria-label="`${item.label}, ${formatValue(item.value)}`"
          @focus="inspect(item.id)" @blur="open = false" @click="inspect(item.id)" @keydown.enter.prevent="inspect(item.id)" @keydown.space.prevent="inspect(item.id)" @keydown.esc="open = false" @pointerenter="$event.pointerType !== 'touch' && inspect(item.id)">
          <rect :x="item.x0" :y="item.y0" :width="item.x1 - item.x0" :height="item.y1 - item.y0" :fill="item.color" rx="2" />
          <text :x="item.depth === model.columns - 1 ? item.x0 - 5 : item.x1 + 5" :y="(item.y0 + item.y1) / 2" dominant-baseline="middle" :text-anchor="item.depth === model.columns - 1 ? 'end' : 'start'">{{ item.label }}</text>
        </g>
      </svg>
      <div v-if="open && (node || link)" class="tip" role="tooltip"><template v-if="node"><b>{{ node.label }}</b> · {{ formatValue(node.value) }} <span>{{ node.description }}</span></template><template v-else-if="link"><b>{{ link.source.label }} → {{ link.target.label }}</b> · {{ formatValue(link.value) }} · {{ (link.share * 100).toFixed(1) }}%</template></div>
    </div>
  </section>
</template>

<style scoped>
.sankey { width: 100%; }.plot { position: relative; }.plot svg { display: block; overflow: visible; }.plot g, .plot path { transition: opacity .15s ease; cursor: pointer; }
.plot text { font: 11px system-ui; fill: currentColor; paint-order: stroke; stroke: Canvas; stroke-width: 3px; }.tip { font-size: 12px; text-align: center; margin-top: 4px; }
</style>

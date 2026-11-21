<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const treemapMessages = {
  label: 'Treemap', tableCaption: '{label} data', item: 'Item', value: 'Value', share: 'Share of total', details: 'Details',
  legend: 'Treemap legend', tiles: 'Treemap tiles', ofTotal: '{share}% of total', noPositive: 'No positive values', empty: 'No treemap data',
}
</script>

<script setup lang="ts">
import { AnimatePresence } from 'motion-v'
import { computed, shallowRef, useId, useTemplateRef, watchEffect } from 'vue'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { buildTreemap, layoutTreemap, TREEMAP_COLORS, type TreemapNode } from './models/treemap'
import { interpolate, SR_ONLY, useHoverCapable, useMeasuredSize } from './plot-utils'
import TreemapTile from './TreemapTile.vue'

const props = withDefaults(defineProps<{
  data: readonly TreemapNode[]; label?: string; formatValue?: (value: number) => string; colors?: readonly string[]
  textColor?: string; activeId?: string | null; defaultActiveId?: string | null; labels?: Partial<typeof treemapMessages>
  /** Classes for the plot element; it defaults to 20rem tall and the layout follows its measured size. */
  plotClass?: string; showLegendValues?: boolean
}>(), { formatValue: (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 }), colors: () => TREEMAP_COLORS, textColor: '#ffffff', activeId: undefined })
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()

const t = (key: keyof typeof treemapMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? treemapMessages[key], values)
const title = computed(() => props.label ?? t('label'))
const model = computed(() => buildTreemap(props.data, props.colors, props.textColor))
const plot = useTemplateRef<HTMLElement>('plot')
const size = useMeasuredSize(plot, { width: 1000, height: 625 })
const tiles = computed(() => layoutTreemap(model.value.nodes, size.value.width, size.value.height))
const canHover = useHoverCapable()
const tooltipId = useId()

const local = shallowRef(props.defaultActiveId ?? null)
const cursor = shallowRef<string | null>(null)
const open = shallowRef(false)
const requested = computed(() => props.activeId === undefined ? local.value : props.activeId)
const active = computed(() => tiles.value.find(tile => tile.id === requested.value) ?? null)
const tabstop = computed(() => (tiles.value.find(tile => tile.id === cursor.value) ?? tiles.value[0])?.id)
watchEffect(() => { if (local.value !== null && !tiles.value.some(tile => tile.id === local.value)) local.value = null })

function setActive(id: string | null) {
  if (requested.value === id) return
  if (props.activeId === undefined) local.value = id
  emit('update:activeId', id)
  emit('activeChange', id)
}
function show(id: string) { setActive(id); open.value = true }
function tileLabel(tile: (typeof tiles.value)[number]) {
  return [tile.path.join(' / '), props.formatValue(tile.value), t('ofTotal', { share: (tile.share * 100).toFixed(1) }), tile.description].filter(Boolean).join('. ')
}
function enter(id: string, event: PointerEvent) {
  if (canHover.value && event.pointerType !== 'touch') show(id)
}
function move(id: string, event: PointerEvent) {
  if (event.pointerType === 'touch' ? event.buttons === 1 : canHover.value) show(id)
}
function focusTile(id: string) { plot.value?.querySelector<HTMLElement>(`[data-treemap-tile="${CSS.escape(id)}"]`)?.focus() }
function onKeydown(event: KeyboardEvent) {
  if (!(event.target instanceof HTMLButtonElement)) return
  const current = tiles.value.find(tile => tile.id === (event.target as HTMLElement).dataset.treemapTile)
  if (!current) return
  if (event.key === 'Escape') { open.value = false; return }
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  let next = current
  if (event.key === 'Home') next = tiles.value[0]
  else if (event.key === 'End') next = tiles.value[tiles.value.length - 1]
  else {
    const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
    const cx = current.x + current.width / 2
    const cy = current.y + current.height / 2
    let best = Number.POSITIVE_INFINITY
    for (const tile of tiles.value) {
      const dx = tile.x + tile.width / 2 - cx
      const dy = tile.y + tile.height / 2 - cy
      const forward = (horizontal ? dx : dy) * direction
      const cross = Math.abs(horizontal ? dy : dx)
      const score = forward + cross * 2
      if (forward > 0.01 && score < best) { next = tile; best = score }
    }
  }
  open.value = true
  if (next.id === current.id) setActive(current.id)
  else focusTile(next.id)
}
function onBlur(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) open.value = false
}
const anchorPoint = computed(() => ({
  x: active.value ? (active.value.x + active.value.width / 2) / size.value.width : 0.5,
  y: active.value ? (active.value.y + active.value.height / 2) / size.value.height : 0.5,
}))
</script>

<template>
  <section class="treemap" data-slot="treemap" :aria-label="title">
    <div ref="plot" role="group" :aria-label="t('tiles')" tabindex="-1" data-slot="treemap-plot" class="plot" :class="plotClass" @keydown="onKeydown" @focusout="onBlur" @pointerleave="open = false">
      <AnimatePresence :initial="false">
        <TreemapTile v-for="(tile, index) in tiles" :key="tile.id" :tile="tile" :width="size.width" :height="size.height" :index="index"
          :label="tileLabel(tile)" :value-text="formatValue(tile.value)" :tabbable="tile.id === tabstop" :selected="open && active?.id === tile.id" :described-by="tooltipId"
          @enter="enter(tile.id, $event)" @move="move(tile.id, $event)" @press="show(tile.id)" @focus="cursor = tile.id; show(tile.id)" />
      </AnimatePresence>
      <p v-if="!tiles.length" class="empty">{{ model.items.length ? t('noPositive') : t('empty') }}</p>
    </div>
    <ChartTip v-if="tiles.length" :id="tooltipId" :anchor="plot" :anchor-point="anchorPoint" :open="open && active !== null" @dismiss="open = false">
      <span v-if="active" class="tip">
        <span v-if="active.path.length > 1" class="muted">{{ active.path.slice(0, -1).join(' / ') }}</span>
        <span class="title">{{ active.label }}</span>
        <span class="figures"><NumberTicker :value="active.value" :format="() => formatValue(active!.value)" :start-on-view="false" :duration="0.2" :stagger="0" />
          <span class="muted">·</span><NumberTicker class="muted" :value="active.share * 100" :format="() => `${(active!.share * 100).toFixed(1)}%`" :start-on-view="false" :duration="0.2" :stagger="0" /></span>
        <span v-if="active.description" class="muted">{{ active.description }}</span>
      </span>
    </ChartTip>
    <ul v-if="model.nodes.length" :aria-label="t('legend')" class="legend">
      <li v-for="node in model.nodes" :key="node.id"><span aria-hidden="true" class="dot" :style="{ backgroundColor: node.color }" /><span class="muted">{{ node.label }}</span><span v-if="showLegendValues" class="mono">{{ formatValue(node.value) }}</span></li>
    </ul>
    <div :style="SR_ONLY"><table><caption>{{ t('tableCaption', { label: title }) }}</caption>
      <thead><tr><th scope="col">{{ t('item') }}</th><th scope="col">{{ t('value') }}</th><th scope="col">{{ t('share') }}</th><th scope="col">{{ t('details') }}</th></tr></thead>
      <tbody><tr v-for="item in model.items" :key="item.id"><th scope="row">{{ item.path.join(' / ') }}</th><td>{{ formatValue(item.value) }}</td><td>{{ (item.share * 100).toFixed(1) }}%</td><td>{{ item.description ?? '' }}</td></tr></tbody></table></div>
  </section>
</template>

<style scoped>
.treemap { display: flex; flex-direction: column; gap: 16px; width: 100%; min-width: 0; }
.plot { position: relative; width: 100%; min-width: 0; height: 20rem; border-radius: 8px; outline: none; }
.plot:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.empty { display: flex; align-items: center; justify-content: center; height: 100%; margin: 0; font-size: 14px; color: var(--beui-muted-foreground); }
.legend { display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 0; padding: 0; list-style: none; font-size: 12px; line-height: 16px; }
.legend li { display: inline-flex; align-items: center; gap: 6px; }
.dot { flex: none; width: 6px; height: 6px; border-radius: 50%; }
.muted { color: var(--beui-muted-foreground); }
.mono { font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-variant-numeric: tabular-nums; }
.tip { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.title { font-weight: 500; }
.figures { display: inline-flex; align-items: center; gap: 8px; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-variant-numeric: tabular-nums; }
</style>

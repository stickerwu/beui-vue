<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { motion, useInView } from 'motion-v'
import { easeOut, layoutSpring } from '../core/motion'
import type { PlacedLink, PlacedNode } from './models/sankey-chart'
import { useSankeyChart } from './sankey-context'

// Link draw-in: each column starts this long after the one before it.
const COLUMN_DELAY = 0.12
const DRAW_DURATION = 0.7
// Nodes shorter than this keep their name in the tooltip and table only.
const MIN_LABEL_HEIGHT = 12
const LABEL_GAP = 8
// Average glyph width of the 12px label face, for fitting labels to a column.
const LABEL_CHAR_WIDTH = 6.6
// Pointer target around each node bar, and its smallest height (WCAG 2.5.8).
const HIT_SLOP = 4
const MIN_HIT = 24
// Flows thinner than this still get this much hover target.
const MIN_LINK_HIT = 8

// `class` styles the plot element (its height), as upstream's className does.
defineOptions({ inheritAttrs: false })
const { showValues = true } = defineProps<{
  /** Show each node's value under its label when there is room. */
  showValues?: boolean
}>()
const { t, title, formatValue, reduce, canHover, nodeWidth, data, plot, size, setSize, nodes, links, columns, step, cursor, open, active, setActive, tabStop, tooltipId, hasNodes, setOpen, setPlot, setCursor } = useSankeyChart()
const element = useTemplateRef<HTMLElement>('element')
let observer: ResizeObserver | undefined
onMounted(() => {
  const node = element.value
  if (!node) return
  setPlot(node)
  const measure = () => {
    const { width, height } = node.getBoundingClientRect()
    if (width > 0 && height > 0 && (size.value.width !== width || size.value.height !== height)) setSize({ width, height })
  }
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(node)
})
onBeforeUnmount(() => { observer?.disconnect(); setPlot(null); setOpen(false) })

// A resize re-lays the chart at once; only a data change springs. The render that commits a new size
// carries `resized`, so its transitions are instant; the follow-up render has the same targets.
const sizeKey = computed(() => `${size.value.width}x${size.value.height}`)
const settledSize = shallowRef(sizeKey.value)
const resized = computed(() => settledSize.value !== sizeKey.value)
watch(sizeKey, key => nextTick(() => { settledSize.value = key }))

const gradient = useId().replace(/[^\w-]/g, '')
const inView = useInView(element, { once: true, amount: 0.3 })
const shown = computed(() => reduce.value || inView.value)
const entered = shallowRef(false)

// A node with any flow to or from the highlighted node lights up with it.
const neighbours = computed(() => {
  const found = new Set<PlacedNode>()
  if (active.value?.type === 'node') for (const link of links.value) {
    if (link.source === active.value.node) found.add(link.target)
    if (link.target === active.value.node) found.add(link.source)
  }
  return found
})
function nodeLit(node: PlacedNode) {
  const current = active.value
  if (!current) return true
  if (current.type === 'link') return current.link.source === node || current.link.target === node
  return current.node === node || neighbours.value.has(node)
}
function linkLit(link: PlacedLink) {
  const current = active.value
  if (!current) return true
  if (current.type === 'link') return current.link === link
  return link.source === current.node || link.target === current.node
}
const linkOpacity = (link: PlacedLink) => active.value ? (linkLit(link) ? 0.6 : 0.08) : 0.32
const geometry = computed(() => reduce.value || resized.value ? { duration: 0 } : layoutSpring)
const labelRoom = computed(() => columns.value > 1 ? step.value - nodeWidth.value - LABEL_GAP * 2 : size.value.width)
// Thin flows' hit paths go on top, so a thick neighbour cannot bury them.
const hitOrder = computed(() => [...links.value].sort((a, b) => b.width - a.width))
const empty = computed(() => data.value.links.length ? null : hasNodes.value ? t('noFlows') : t('empty'))

/** Fits a label to `room` px, ending in an ellipsis; null when nothing fits. */
function fit(label: string, room: number) {
  const chars = Math.floor(room / LABEL_CHAR_WIDTH)
  if (chars >= label.length) return label
  if (chars < 4) return null
  return `${label.slice(0, chars - 1).trimEnd()}…`
}
const labelled = computed(() => nodes.value.flatMap(node => {
  const height = node.y1 - node.y0
  if (height < MIN_LABEL_HEIGHT) return []
  const text = fit(node.label, labelRoom.value)
  if (!text) return []
  const last = columns.value > 1 && node.depth === columns.value - 1
  const value = formatValue(node.value)
  return [{ node, text, last, x: last ? node.x0 - LABEL_GAP : node.x1 + LABEL_GAP, value, twoLines: showValues && height >= MIN_LABEL_HEIGHT * 2.4 && value.length * LABEL_CHAR_WIDTH <= labelRoom.value }]
}))

function point(event: PointerEvent, id: string) {
  if (event.pointerType === 'touch' ? event.buttons !== 1 : !canHover.value) return
  press(id)
}
function press(id: string) { setActive(id); setOpen(true) }
function focusNode(id: string) { element.value?.querySelector<HTMLElement>(`[data-sankey-node="${CSS.escape(id)}"]`)?.focus() }
function onKeydown(event: KeyboardEvent) {
  const target = event.target
  if (!(target instanceof HTMLButtonElement)) return
  const current = nodes.value.find(node => node.id === target.dataset.sankeyNode)
  if (!current) return
  if (event.key === 'Escape') { if (!open.value) return; event.preventDefault(); setOpen(false); return }
  const center = (node: PlacedNode) => (node.y0 + node.y1) / 2
  const column = (depth: number) => nodes.value.filter(node => node.depth === depth)
  let next: PlacedNode | undefined
  if (event.key === 'Home') next = nodes.value[0]
  else if (event.key === 'End') next = nodes.value[nodes.value.length - 1]
  else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    const same = column(current.depth)
    next = same[same.indexOf(current) + (event.key === 'ArrowUp' ? -1 : 1)]
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    // Nearest node by height in the next populated column that way.
    const direction = event.key === 'ArrowLeft' ? -1 : 1
    for (let depth = current.depth + direction; depth >= 0 && depth < columns.value && !next; depth += direction) {
      next = column(depth).reduce<PlacedNode | undefined>((best, node) => !best || Math.abs(center(node) - center(current)) < Math.abs(center(best) - center(current)) ? node : best, undefined)
    }
  } else return
  event.preventDefault()
  setOpen(true)
  if (next && next !== current) focusNode(next.id)
  else setActive(current.id)
}
function onFocusout(event: FocusEvent) {
  if ((event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) return
  setOpen(false)
  setActive(null)
}
function onLeave(event: PointerEvent) {
  // A lifted finger leaves too; touch dismisses by tapping elsewhere.
  if (event.pointerType === 'touch') return
  setOpen(false)
  setActive(null)
}
// A tap or click elsewhere dismisses what a tap opened; touch has no hover to leave.
watch(open, (value, _, cleanup) => {
  if (!value) return
  const dismiss = (event: PointerEvent) => {
    if (element.value?.contains(event.target as Node)) return
    setOpen(false)
    setActive(null)
  }
  document.addEventListener('pointerdown', dismiss)
  cleanup(() => document.removeEventListener('pointerdown', dismiss))
})
function nodeLabel(node: PlacedNode) {
  return [node.label, formatValue(node.value), node.inValue && node.outValue ? t('nodeFlows', { in: formatValue(node.inValue), out: formatValue(node.outValue) }) : null, node.description].filter(Boolean).join('. ')
}
</script>

<template>
  <!-- Scrolls sideways under 32rem. The padding, cancelled by the margin, holds the node hit areas and focus rings that reach past the plot. -->
  <div class="scroller">
    <div ref="element" role="group" :aria-label="t('nodes', { label: title })" tabindex="-1" data-slot="sankey-chart-plot" class="plot" :class="$attrs.class" @keydown="onKeydown" @focusout="onFocusout" @pointerleave="onLeave">
      <svg :width="size.width" :height="size.height" :viewBox="`0 0 ${size.width} ${size.height}`" aria-hidden="true" class="canvas">
        <defs>
          <linearGradient v-for="(link, index) in links" :id="`${gradient}-${index}`" :key="link.id" gradientUnits="userSpaceOnUse" :x1="link.x0" :x2="link.x1">
            <stop offset="0%" :stop-color="link.source.color" /><stop offset="100%" :stop-color="link.target.color" />
          </linearGradient>
        </defs>
        <g fill="none" pointer-events="none">
          <motion.path v-for="(link, index) in links" :key="link.id" tabindex="-1" :stroke="`url(#${gradient}-${index})`" :stroke-width="Math.max(1, link.width)"
            :initial="reduce ? false : { d: link.path, pathLength: 0, opacity: 0.32 }"
            :animate="shown ? { d: link.path, pathLength: 1, opacity: linkOpacity(link) } : undefined"
            :transition="reduce ? { duration: 0 } : { d: geometry, pathLength: { duration: DRAW_DURATION, ease: easeOut, delay: entered ? 0 : link.source.depth * COLUMN_DELAY }, opacity: { duration: 0.16, ease: easeOut } }"
            @animation-complete="entered = true" />
        </g>
        <!-- Static hit paths own hover: never animated, at least MIN_LINK_HIT wide, and on the final geometry. -->
        <g fill="none" stroke="transparent">
          <path v-for="link in hitOrder" :key="link.id" :d="link.path" :stroke-width="Math.max(MIN_LINK_HIT, link.width)" :pointer-events="shown ? 'stroke' : 'none'" class="hit"
            @pointerenter="point($event, link.id)" @pointermove="point($event, link.id)" @pointerdown="press(link.id)" />
        </g>
        <g pointer-events="none">
          <motion.rect v-for="node in nodes" :key="node.id" tabindex="-1" :x="node.x0" :width="node.x1 - node.x0" rx="2" :fill="node.color"
            :initial="reduce ? false : { y: node.y0, height: node.y1 - node.y0, opacity: 0 }"
            :animate="shown ? { y: node.y0, height: Math.max(1, node.y1 - node.y0), opacity: nodeLit(node) ? 1 : 0.3 } : undefined"
            :transition="reduce ? { duration: 0 } : { y: geometry, height: geometry, opacity: { duration: entered ? 0.16 : 0.3, ease: easeOut, delay: entered ? 0 : 0.1 + node.depth * COLUMN_DELAY } }" />
        </g>
        <g class="labels" pointer-events="none">
          <motion.text v-for="item in labelled" :key="item.node.id" tabindex="-1" :x="item.x" :text-anchor="item.last ? 'end' : 'start'" dominant-baseline="middle" class="label" stroke-width="3" stroke-linejoin="round"
            :initial="reduce ? false : { y: (item.node.y0 + item.node.y1) / 2, opacity: 0 }"
            :animate="shown ? { y: (item.node.y0 + item.node.y1) / 2, opacity: nodeLit(item.node) ? 1 : 0.35 } : undefined"
            :transition="reduce ? { duration: 0 } : { y: geometry, opacity: { duration: 0.2, ease: easeOut, delay: entered ? 0 : 0.2 + item.node.depth * COLUMN_DELAY } }">
            <tspan :x="item.x" :dy="item.twoLines ? '-0.6em' : 0" class="name">{{ item.text }}</tspan>
            <tspan v-if="item.twoLines" :x="item.x" dy="1.2em" class="amount">{{ item.value }}</tspan>
          </motion.text>
        </g>
      </svg>
      <button v-for="node in nodes" :key="node.id" type="button" :data-sankey-node="node.id" :tabindex="node.id === tabStop ? 0 : -1" :aria-label="nodeLabel(node)"
        :aria-describedby="open && active?.type === 'node' && active.node === node ? tooltipId : undefined" class="node"
        :style="{ left: `${node.x0 - HIT_SLOP}px`, top: `${node.y0 + Math.max(1, node.y1 - node.y0) / 2 - Math.max(MIN_HIT, Math.max(1, node.y1 - node.y0) + HIT_SLOP * 2) / 2}px`, width: `${node.x1 - node.x0 + HIT_SLOP * 2}px`, height: `${Math.max(MIN_HIT, Math.max(1, node.y1 - node.y0) + HIT_SLOP * 2)}px`, pointerEvents: shown ? 'auto' : 'none' }"
        @pointerenter="point($event, node.id)" @pointermove="point($event, node.id)" @pointerdown="press(node.id)" @focus="setCursor(node.id); press(node.id)" />
      <p v-if="empty" class="empty">{{ empty }}</p>
    </div>
  </div>
</template>

<style scoped>
.scroller { margin: -8px; padding: 8px; overflow-x: auto; overflow-y: hidden; }
.plot { position: relative; width: 100%; min-width: 32rem; height: 20rem; outline: none; }
.canvas { position: absolute; inset: 0; overflow: visible; }
.hit { cursor: pointer; }
.label { fill: var(--beui-foreground); stroke: var(--beui-background); paint-order: stroke; font-size: 12px; }
.name { font-weight: 500; }
.amount { fill: var(--beui-muted-foreground); font-variant-numeric: tabular-nums; }
.node { position: absolute; margin: 0; padding: 0; border: 0; border-radius: 2px; background: transparent; outline: none; }
.node:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.empty { display: flex; align-items: center; justify-content: center; height: 100%; margin: 0; font-size: 14px; color: var(--beui-muted-foreground); }
</style>

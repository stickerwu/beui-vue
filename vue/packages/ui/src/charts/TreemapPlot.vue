<script setup lang="ts">
import { AnimatePresence } from 'motion-v'
import { nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'
import type { TreemapTile as TreemapTileData } from './models/treemap'
import TreemapTile from './TreemapTile.vue'
import { useTreemap } from './treemap-context'

defineSlots<{
  /** Presentation content for one tile; each tile still owns its button and accessible name. */
  renderTile?(props: { tile: TreemapTileData }): unknown
}>()
const { tileClass } = defineProps<{
  /** Classes added to every tile button. */
  tileClass?: string
}>()
const { tiles, model, size, setSize, plot, cursor, tabstop, tooltipId, tooltipOpen, active, canHover, formatValue, t, setActive, setPlot, setCursor, setTooltipOpen } = useTreemap()
const element = useTemplateRef<HTMLElement>('element')
let focusedId: string | null = null

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
onBeforeUnmount(() => { observer?.disconnect(); setPlot(null) })

// When the focused tile leaves the layout, hand focus to the cursor's tile instead of dropping it on the page.
watch(tiles, async () => {
  const id = focusedId
  if (!id || tiles.value.some(tile => tile.id === id)) return
  focusedId = null
  const lost = element.value?.querySelector<HTMLElement>(`[data-treemap-tile="${CSS.escape(id)}"]`)
  await nextTick()
  if (document.activeElement === lost || document.activeElement === document.body) {
    if (tabstop.value) focusTile(tabstop.value)
    else element.value?.focus()
  }
}, { flush: 'pre' })

function show(id: string) { setActive(id); setTooltipOpen(true) }
function tileLabel(tile: TreemapTileData) {
  return [tile.path.join(' / '), formatValue(tile.value), t('ofTotal', { share: (tile.share * 100).toFixed(1) }), tile.description].filter(Boolean).join('. ')
}
function enter(id: string, event: PointerEvent) {
  if (canHover.value && event.pointerType !== 'touch') show(id)
}
function move(id: string, event: PointerEvent) {
  if (event.pointerType === 'touch' ? event.buttons === 1 : canHover.value) show(id)
}
function focusTile(id: string) { element.value?.querySelector<HTMLElement>(`[data-treemap-tile="${CSS.escape(id)}"]`)?.focus() }
function onFocusin(event: FocusEvent) {
  if (event.target instanceof HTMLButtonElement) focusedId = event.target.dataset.treemapTile ?? null
}
function onKeydown(event: KeyboardEvent) {
  if (!(event.target instanceof HTMLButtonElement)) return
  const current = tiles.value.find(tile => tile.id === (event.target as HTMLElement).dataset.treemapTile)
  if (!current) return
  if (event.key === 'Escape') { setTooltipOpen(false); return }
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
  setTooltipOpen(true)
  if (next.id === current.id) setActive(current.id)
  else focusTile(next.id)
}
function onFocusout(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) { focusedId = null; setTooltipOpen(false) }
}
</script>

<template>
  <div ref="element" role="group" :aria-label="t('tiles')" tabindex="-1" data-slot="treemap-plot" class="plot" @keydown="onKeydown" @focusin="onFocusin" @focusout="onFocusout" @pointerleave="setTooltipOpen(false)">
    <AnimatePresence :initial="false">
      <TreemapTile v-for="(tile, index) in tiles" :key="tile.id" :tile="tile" :width="size.width" :height="size.height" :index="index" :class="tileClass"
        :label="tileLabel(tile)" :value-text="formatValue(tile.value)" :tabbable="tile.id === tabstop" :selected="tooltipOpen && active?.id === tile.id" :described-by="tooltipId"
        @enter="enter(tile.id, $event)" @move="move(tile.id, $event)" @press="show(tile.id)" @focus="setCursor(tile.id); show(tile.id)">
        <template v-if="$slots.renderTile" #default="{ tile: current }"><slot name="renderTile" :tile="current" /></template>
      </TreemapTile>
    </AnimatePresence>
    <p v-if="!tiles.length" class="empty">{{ model.items.length ? t('noPositive') : t('empty') }}</p>
  </div>
</template>

<style scoped>
.plot { position: relative; width: 100%; min-width: 0; height: 20rem; border-radius: 8px; outline: none; }
.plot:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.empty { display: flex; align-items: center; justify-content: center; height: 100%; margin: 0; font-size: 14px; color: var(--beui-muted-foreground); }
</style>

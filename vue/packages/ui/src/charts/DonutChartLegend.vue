<script setup lang="ts">
import { motion } from 'motion-v'
import { layoutSpring } from '../core/motion'
import { useDonutChart, type DonutPlacedSegment } from './donut-context'

defineSlots<{
  /** Extra line under each name, such as terms or a note. */
  renderDetail?(props: { segment: DonutPlacedSegment }): unknown
  /** Trailing value. Defaults to the share and formatted value. */
  renderValue?(props: { segment: DonutPlacedSegment }): unknown
}>()
/**
 * Legend rows share focus with the ring: hovering or focusing a row pops its segment, and arrow keys move between
 * rows. Each row carries a share bar.
 */
const { placed, active, setActive, select, selectable, selectedId, formatValue, reduce, canHover } = useDonutChart()
function step(event: KeyboardEvent, index: number) {
  const offset = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
  if (!offset) return
  event.preventDefault()
  const rows = (event.currentTarget as HTMLElement).closest('ul')?.querySelectorAll<HTMLButtonElement>('[data-donut-legend]')
  rows?.[(index + offset + placed.value.length) % placed.value.length]?.focus()
}
</script>

<template>
  <ul class="legend" data-slot="donut-chart-legend">
    <li v-for="(item, index) in placed" :key="item.id">
      <button type="button" data-donut-legend class="row" :class="{ focused: active === item.id, selected: selectedId === item.id }"
        :aria-pressed="selectable() ? selectedId === item.id : undefined" @click="select(item.id)"
        @pointerenter="canHover && setActive(item.id)" @pointerleave="canHover && setActive(null)" @focus="setActive(item.id)" @blur="setActive(null)" @keydown="step($event, index)">
        <span class="line">
          <span aria-hidden="true" class="swatch" :style="{ backgroundColor: item.color }" />
          <span class="name">{{ item.name }}</span>
          <span class="figures">
            <slot name="renderValue" :segment="item"><span class="pct">{{ (item.share * 100).toFixed(1) }}%</span><span class="amt">{{ formatValue(item.value) }}</span></slot>
          </span>
        </span>
        <span v-if="$slots.renderDetail" class="detail"><slot name="renderDetail" :segment="item" /></span>
        <span aria-hidden="true" class="track-bar">
          <motion.span tabindex="-1" class="fill" :style="{ backgroundColor: item.color }" :initial="reduce ? false : { scaleX: 0 }" :animate="{ scaleX: item.share }"
            :transition="reduce ? { duration: 0 } : { ...layoutSpring, delay: 0.2 + index * 0.06 }" />
        </span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.legend { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; }
.legend li { margin: 0; }
.row { display: block; width: 100%; padding: 8px 12px; border: 0; border-radius: 12px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; outline: none; transition: background-color 150ms, box-shadow 150ms; }
.row:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
.row.focused { background: var(--beui-muted); }
.row.selected { box-shadow: 0 0 0 1px var(--beui-border); }
.row:focus-visible { box-shadow: 0 0 0 2px rgb(17 17 17 / 12%); }
.line { display: flex; align-items: center; gap: 12px; }
.swatch { width: 10px; height: 10px; flex: none; border-radius: 9999px; }
.name { min-width: 0; flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 20px; font-weight: 500; }
.figures { flex: none; text-align: right; font-size: 14px; line-height: 20px; font-variant-numeric: tabular-nums; }
.pct { font-weight: 500; }
.amt { margin-left: 8px; color: var(--beui-muted-foreground); }
.detail { display: block; margin-top: 2px; padding-left: 22px; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.track-bar { display: block; height: 4px; margin: 8px 0 0 22px; overflow: hidden; border-radius: 9999px; background: var(--beui-muted); }
.fill { display: block; height: 100%; transform-origin: left; border-radius: 9999px; }
:global(.dark .donut-chart .row:focus-visible) { box-shadow: 0 0 0 2px rgb(255 255 255 / 10%); }
</style>

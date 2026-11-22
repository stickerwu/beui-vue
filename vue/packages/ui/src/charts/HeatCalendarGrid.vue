<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { motion } from 'motion-v'
import { pressSpring } from '../core/motion'
import { HEAT_DAYS as DAYS, HEAT_GAP as GAP, HEAT_LIFT as LIFT, HEAT_MONTH_ROW as MONTH_ROW, HEAT_PITCH as PITCH, useHeatCalendar } from './heat-calendar-context'

defineSlots<{
  /** Overlay content rendered inside the grid, normally `HeatCalendarTooltip`. */
  default?(): unknown
}>()
const { weeks, reduce, canHover, pinned, step, settled, level, bucket, fill, count, dateOf, future, cols, clear, span, select, hot, hotMonth, setHover, gridEl, tooltipId, unit, t, formats, setGridEl } = useHeatCalendar()
const grid = useTemplateRef<HTMLElement>('grid')
watch(grid, element => { setGridEl(element) }, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { setGridEl(null) })

const cells = computed(() => cols.value.flatMap(({ w }) => DAYS.flatMap(d => {
  if (future(w, d)) return []
  const date = dateOf(w, d)
  const v = level(w, d)
  const b = bucket(v)
  const i = w * 7 + d
  const on = hot.value?.w === w && hot.value?.d === d
  const isEnd = span.value ? i === span.value.lo || i === span.value.hi : pinned.value?.w === w && pinned.value?.d === d
  const dim = (step.value !== null && step.value !== b) || (span.value !== null && (i < span.value.lo || i > span.value.hi))
  // the ripple: the hovered cell rises most, the ring around it a little, two out barely
  const dist = hot.value ? Math.max(Math.abs(hot.value.w - w), Math.abs(hot.value.d - d)) : 9
  const lift = reduce.value || !canHover.value ? 1 : dist === 0 ? LIFT[0] : dist < LIFT.length ? LIFT[dist] : 1
  const animate = settled.value
    ? { opacity: 1, scale: lift, transition: { ...pressSpring, delay: Math.min(dist, 3) * 0.03 } }
    : { opacity: 1, scale: 1, transition: reduce.value ? { duration: 0 } : { ...pressSpring, delay: (w + d) * 0.018 } }
  return [{
    key: `w${w}-d${d}`, w, d, b, on, isEnd, dim, dist, lift, animate, background: fill(b),
    label: date ? t('cell', { count: count(v), unit: unit.value, date: formats.day.format(date) }) : t('cellUndated', { count: count(v), unit: unit.value }),
  }]
})))
</script>

<template>
  <div ref="grid" class="grid" data-slot="heat-calendar-grid" :style="{ width: `${weeks * PITCH - GAP}px`, gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`, gridTemplateRows: `${MONTH_ROW}px repeat(7, auto)`, gap: `${GAP}px` }" @pointerleave="setHover(null)">
    <template v-for="c in cols" :key="`m${c.w}`">
      <span v-if="c.label" class="month" :class="{ hot: hotMonth === c.m }" :style="{ gridColumn: c.w + 1, gridRow: 1 }">{{ c.label }}</span>
    </template>
    <!-- the outer span owns the legend dim so it never fights the transforms inside -->
    <span v-for="cell in cells" :key="cell.key" class="cell" :style="{ gridColumn: cell.w + 1, gridRow: cell.d + 2, opacity: cell.dim ? 0.25 : 1, zIndex: cell.lift > 1 ? LIFT.length - cell.dist : 0 }">
      <!-- the hit area is the cell plus half the gap on every side, so a fast pointer never falls through; the visual inside never takes pointer events -->
      <motion.button type="button" class="hit" :aria-label="cell.label" :data-heat-cell="`${cell.w}-${cell.d}`" :aria-pressed="cell.isEnd" :aria-describedby="cell.on ? tooltipId : undefined"
        :while-tap="reduce ? undefined : { scale: 0.9, transition: pressSpring }"
        @pointerenter="setHover({ w: cell.w, d: cell.d })" @focus="setHover({ w: cell.w, d: cell.d })" @blur="setHover(null)" @click="select({ w: cell.w, d: cell.d })" @keydown.esc="clear">
        <!-- the diagonal wave: each cell arrives (w + d) steps after the corner; once settled, the ripple spreads out by distance -->
        <motion.span class="face" :style="{ background: cell.background, boxShadow: cell.isEnd ? '0 0 0 2px var(--beui-background), 0 0 0 3.5px var(--beui-foreground)' : 'none' }"
          :initial="reduce ? false : { opacity: 0, scale: 0.4 }" :animate="cell.animate">
          <Transition name="ring"><span v-if="cell.on && !cell.isEnd" class="ring" /></Transition>
        </motion.span>
      </motion.button>
    </span>
    <slot />
  </div>
</template>

<style scoped>
.grid { position: relative; display: grid; max-width: 100%; }
.month { white-space: nowrap; font-size: 10px; line-height: 1; color: var(--beui-muted-foreground); transition: color .2s; }
.month.hot { color: var(--beui-foreground); }
.cell { position: relative; display: block; width: 100%; aspect-ratio: 1 / 1; transition: opacity .2s; }
.hit { position: absolute; inset: -2px; display: block; margin: 0; padding: 0; border: 0; border-radius: 5px; background: transparent; outline: none; cursor: pointer; }
.hit:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 12%, transparent); }
.face { position: absolute; inset: 2px; display: block; border-radius: 4px; pointer-events: none; transition: box-shadow .15s; }
.ring { position: absolute; inset: 0; display: block; border: 1.5px solid color-mix(in srgb, var(--beui-foreground) 55%, transparent); border-radius: inherit; pointer-events: none; }
.ring-enter-active, .ring-leave-active { transition: opacity .12s cubic-bezier(.16, 1, .3, 1); }
.ring-enter-from, .ring-leave-to { opacity: 0; }
</style>

<script setup lang="ts">
import { onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { motion } from 'motion-v'
import { easeOut, pressSpring } from '../core/motion'
import { DOWN, ink, RETURNS_RING as RING, RETURNS_YEAR as YEAR, same, signed, tint, UP, useReturnsCalendar } from './returns-calendar-context'

defineSlots<{
  /** Overlay content rendered inside the grid, normally `ReturnsCalendarTooltip`. */
  default?(): unknown
}>()
const { years, cols, t, reduce, canHover, pinned, settled, totals, valueAt, range, span, yearSpan, hot, sweepRow, enter, select, clearOnEscape, setHover, gridEl, tooltipId, setGridEl } = useReturnsCalendar()
const grid = useTemplateRef<HTMLElement>('grid')
watch(grid, element => { setGridEl(element) }, { immediate: true, flush: 'post' })
onBeforeUnmount(() => { setGridEl(null) })

function cellState(y: number, m: number) {
  const on = same(hot.value, y, m)
  const v = valueAt(y, m)
  const i = y * 12 + m
  const isEnd = span.value ? i === span.value.lo || i === span.value.hi : same(pinned.value, y, m)
  // a year span lights whole rows; months in the picked years stay lit, the rest dim
  const dim = span.value ? i < span.value.lo || i > span.value.hi : yearSpan.value ? y < yearSpan.value.lo || y > yearSpan.value.hi : !!hot.value && !on && hot.value.y !== y && hot.value.m !== m
  return { on, v, isEnd, dim }
}
function cellAnimate(y: number, m: number, on: boolean) {
  if (sweepRow.value === y && !reduce.value) return { opacity: 1, scale: [1, 1.1, 1], transition: { duration: 0.36, ease: easeOut, delay: m * 0.035 } }
  if (settled.value) return { opacity: 1, scale: on && canHover.value && !reduce.value ? 1.15 : 1, transition: pressSpring }
  return { opacity: 1, scale: 1, transition: reduce.value ? { duration: 0 } : { ...pressSpring, delay: (y + m) * 0.02 } }
}
const yearDim = (y: number) => (span.value ? y < Math.floor(span.value.lo / 12) || y > Math.floor(span.value.hi / 12) : yearSpan.value ? y < yearSpan.value.lo || y > yearSpan.value.hi : !!hot.value && hot.value.y !== y) ? 0.35 : 1
const yearEnd = (y: number) => yearSpan.value ? y === yearSpan.value.lo || y === yearSpan.value.hi : same(pinned.value, y, YEAR)
</script>

<template>
  <div ref="grid" class="grid" data-slot="returns-calendar-grid" @pointerleave="setHover(null)">
    <span />
    <span v-for="c in cols" :key="c.name" class="head" :class="{ hot: hot?.m === c.m }">{{ c.initial }}</span>
    <span class="head" :class="{ hot: hot?.m === YEAR }">{{ t('year') }}</span>

    <template v-for="(year, y) in years" :key="year">
      <span class="year-label" :class="{ hot: hot?.y === y }">{{ `’${String(year).slice(2)}` }}</span>

      <template v-for="c in cols" :key="`${year}-${c.name}`">
        <span class="cell" :style="{ opacity: cellState(y, c.m).dim ? 0.35 : 1 }">
          <!-- the hit area is the cell plus half the gap on every side, so the grid has no dead space; the visual inside never takes pointer events -->
          <motion.button type="button" class="hit" :data-return-cell="`${y}-${c.m}`" :aria-describedby="cellState(y, c.m).on ? tooltipId : undefined"
            :aria-label="t('monthCell', { month: c.name, year: String(year), value: signed(cellState(y, c.m).v, 1) })" :aria-pressed="cellState(y, c.m).isEnd"
            :while-tap="reduce ? undefined : { scale: 0.92, transition: pressSpring }"
            @pointerenter="enter(y, c.m)()" @focus="enter(y, c.m)()" @blur="setHover(null)" @click="select({ y, m: c.m })" @keydown="clearOnEscape">
            <motion.span class="face" :style="{
              background: tint(cellState(y, c.m).v, range, cellState(y, c.m).on),
              color: `color-mix(in srgb, var(--beui-foreground) ${Math.round(85 + Math.min(Math.abs(cellState(y, c.m).v) / range, 1) * 15)}%, transparent)`,
              boxShadow: cellState(y, c.m).isEnd ? RING : 'none',
            }" :initial="reduce ? false : { opacity: 0, scale: 0.6 }" :animate="cellAnimate(y, c.m, cellState(y, c.m).on)">
              <!-- the ring lives INSIDE the cell so it always shares the cell's exact size, scale and roundness -->
              <Transition name="ring">
                <span v-if="cellState(y, c.m).on && !cellState(y, c.m).isEnd" class="ring" :style="{ borderColor: cellState(y, c.m).v >= 0 ? UP : DOWN }" />
              </Transition>
              {{ Math.abs(cellState(y, c.m).v) >= 4 ? Math.round(cellState(y, c.m).v) : '' }}
            </motion.span>
          </motion.button>
        </span>
      </template>

      <span class="total" :style="{ opacity: yearDim(y) }">
        <motion.button type="button" class="hit" :data-return-cell="`${y}-${YEAR}`" :aria-describedby="same(hot, y, YEAR) ? tooltipId : undefined"
          :aria-label="t('yearCell', { year: String(year), value: signed(totals[y], 1) })" :aria-pressed="yearEnd(y)"
          :while-tap="reduce ? undefined : { scale: 0.96, transition: pressSpring }"
          @pointerenter="enter(y, YEAR)()" @focus="enter(y, YEAR)()" @blur="setHover(null)" @click="select({ y, m: YEAR })" @keydown="clearOnEscape">
          <!-- a neutral cell under the colored number: the tint of the same hue ate its contrast -->
          <motion.span class="face year" :style="{
            background: same(hot, y, YEAR) ? 'var(--beui-background)' : 'color-mix(in srgb, var(--beui-foreground) 6%, transparent)',
            color: ink(totals[y]),
            boxShadow: yearEnd(y) ? RING : same(hot, y, YEAR) ? 'inset 0 0 0 1px color-mix(in srgb, var(--beui-foreground) 12%, transparent)' : 'none',
          }" :initial="reduce ? false : { opacity: 0 }" :animate="{ opacity: 1 }"
            :transition="reduce ? { duration: 0 } : { duration: 0.4, ease: easeOut, delay: 0.02 * (y + 13) }">
            <Transition name="ring">
              <span v-if="same(hot, y, YEAR) && !yearEnd(y)" class="ring" :style="{ borderColor: totals[y] >= 0 ? UP : DOWN }" />
            </Transition>
            {{ signed(totals[y], 0) }}%
          </motion.span>
        </motion.button>
      </span>
    </template>
    <slot />
  </div>
</template>

<style scoped>
.grid { position: relative; display: grid; grid-template-columns: 32px repeat(12, 1fr) 52px; gap: 4px; }
.head { padding-bottom: 4px; text-align: center; font-size: 10px; line-height: 1.5; color: var(--beui-muted-foreground); transition: color .2s; }
.head.hot, .year-label.hot { color: var(--beui-foreground); }
.year-label { display: flex; align-items: center; justify-content: flex-end; padding-right: 6px; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 10px; line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); transition: color .2s; }
.cell { position: relative; display: block; width: 100%; aspect-ratio: 1 / 1; transition: opacity .2s; }
.total { position: relative; display: block; transition: opacity .2s; }
.hit { position: absolute; inset: -2px; display: block; margin: 0; padding: 0; border: 0; border-radius: 5px; background: transparent; color: inherit; font: inherit; outline: none; cursor: pointer; }
.hit:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 12%, transparent); }
.face { position: absolute; inset: 2px; display: grid; place-items: center; border-radius: 4px; pointer-events: none; font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 9px; line-height: 1.5; font-weight: 500; font-variant-numeric: tabular-nums; transition: background .15s, box-shadow .15s; }
.face.year { font-size: 11px; }
.ring { position: absolute; inset: 0; border: 1.5px solid; border-radius: inherit; pointer-events: none; }
.ring-enter-active, .ring-leave-active { transition: opacity .12s cubic-bezier(.16, 1, .3, 1); }
.ring-enter-from, .ring-leave-to { opacity: 0; }
</style>

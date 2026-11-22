<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut } from '../core/motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { LIQUIDITY_HEAT as HEAT, useLiquidityHeatmap } from './liquidity-context'
import { pricePosition } from './models/liquidity-heatmap'

const { t, formatPrice, formatSize, columns, prices, ceiling, unit } = useLiquidityHeatmap()
const reduced = useReducedMotion()
const heatColor = (value: number) => HEAT[Math.min(HEAT.length - 1, Math.floor((ceiling.value > 0 ? value / ceiling.value : 0) * HEAT.length))]

const root = useTemplateRef<HTMLElement>('root')
const anchor = shallowRef<HTMLElement | null>(null)
const tooltipId = useId()
const keyOf = (columnId: string, price: number) => JSON.stringify([columnId, price])
const keys = computed(() => prices.value.flatMap(price => columns.value.map(column => keyOf(column.id, price))))
const activeRaw = shallowRef<string | null>(null)
const cursorRaw = shallowRef<string | null>(null)
// Resolved during render: a cell that left the data clears.
const active = computed(() => activeRaw.value !== null && keys.value.includes(activeRaw.value) ? activeRaw.value : null)
const tabStop = computed(() => cursorRaw.value !== null && keys.value.includes(cursorRaw.value) ? cursorRaw.value : keys.value[0])
const activeIndex = computed(() => active.value === null ? -1 : keys.value.indexOf(active.value))
const row = computed(() => Math.floor(activeIndex.value / columns.value.length))
const selected = computed(() => activeIndex.value >= 0 ? columns.value[activeIndex.value % columns.value.length] : null)
const size = computed(() => selected.value ? selected.value.levels.get(prices.value[row.value]) : undefined)

const path = computed(() => {
  let connected = false
  return columns.value.map((column, index) => {
    const y = column.price === undefined ? null : pricePosition(column.price, prices.value)
    if (y === null) { connected = false; return '' }
    const command = connected ? 'L' : 'M'
    connected = true
    return `${command}${index + 0.5},${y}`
  }).join(' ')
})
// Remount only when trace topology changes; numeric coordinates otherwise interpolate together.
const traceKey = computed(() => columns.value.map(column => `${column.id}:${column.price !== undefined && pricePosition(column.price, prices.value) !== null}`).join('|'))
const axisColumns = computed(() => columns.value.filter((_, index) => index % Math.max(1, Math.ceil(columns.value.length / 5)) === 0 || index === columns.value.length - 1))

function cellLabel(columnLabel: string, price: number, value: number | undefined) {
  return value === undefined
    ? t('cellEmpty', { time: columnLabel, price: formatPrice(price) })
    : t('cell', { time: columnLabel, price: formatPrice(price), size: formatSize(value), unit: unit.value })
}
function enter(event: PointerEvent, key: string) {
  if (event.pointerType === 'touch') return
  anchor.value = event.currentTarget as HTMLElement
  activeRaw.value = key
}
function focus(event: FocusEvent, key: string) {
  anchor.value = event.currentTarget as HTMLElement
  cursorRaw.value = key
  activeRaw.value = key
}
function click(event: MouseEvent, key: string) { anchor.value = event.currentTarget as HTMLElement; activeRaw.value = key }
function keydown(event: KeyboardEvent, rowIndex: number, columnIndex: number) {
  if (event.key === 'Escape') { activeRaw.value = null; return }
  const moves: Record<string, [number, number]> = {
    ArrowRight: [rowIndex, columnIndex + 1], ArrowLeft: [rowIndex, columnIndex - 1], ArrowDown: [rowIndex + 1, columnIndex],
    ArrowUp: [rowIndex - 1, columnIndex], Home: [rowIndex, 0], End: [rowIndex, columns.value.length - 1],
  }
  if (!(event.key in moves)) return
  event.preventDefault()
  const [nextRow, nextColumn] = moves[event.key]
  if (nextRow < 0 || nextRow >= prices.value.length || nextColumn < 0 || nextColumn >= columns.value.length) return
  root.value?.querySelector<HTMLElement>(`[data-cell="${nextRow * columns.value.length + nextColumn}"]`)?.focus()
}
</script>

<template>
  <p v-if="!prices.length || !columns.length" class="empty">{{ t('empty') }}</p>
  <div v-else ref="root" class="scroller" data-slot="liquidity-heatmap-plot">
    <div class="body" :style="{ minWidth: `${Math.max(480, columns.length * 24)}px` }">
      <div class="grid-wrap">
        <table :aria-label="t('table')" class="grid">
          <thead class="sr"><tr><th v-for="column in columns" :key="column.id" scope="col">{{ column.label }}</th></tr></thead>
          <tbody>
            <tr v-for="(price, rowIndex) in prices" :key="price">
              <td v-for="(column, columnIndex) in columns" :key="column.id">
                <button type="button" :data-cell="rowIndex * columns.length + columnIndex" :tabindex="keyOf(column.id, price) === tabStop ? 0 : -1" class="cell"
                  :aria-label="cellLabel(column.label, price, column.levels.get(price))" :aria-describedby="keyOf(column.id, price) === active ? tooltipId : undefined"
                  @pointerenter="enter($event, keyOf(column.id, price))" @pointerleave="activeRaw = null" @focus="focus($event, keyOf(column.id, price))" @blur="activeRaw = null"
                  @click="click($event, keyOf(column.id, price))" @keydown="keydown($event, rowIndex, columnIndex)">
                  <motion.span aria-hidden="true" class="fill" :initial="false"
                    :animate="{ opacity: column.levels.get(price) === undefined ? 0 : 1, backgroundColor: heatColor(column.levels.get(price) ?? 0) }" :transition="{ duration: 0.28, ease: easeOut }" />
                  <span v-if="keyOf(column.id, price) === active" aria-hidden="true" class="ring" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div aria-hidden="true" class="y-axis"><span v-for="price in prices" :key="price">{{ formatPrice(price) }}</span></div>
        <svg :key="traceKey" aria-hidden="true" class="trace" :viewBox="`0 0 ${columns.length} ${prices.length}`" preserveAspectRatio="none">
          <motion.path tabindex="-1" :initial="false" :animate="{ d: path }" :transition="{ duration: reduced ? 0 : 0.28, ease: easeOut }" fill="none" stroke="black" stroke-opacity="0.35" stroke-width="4" vector-effect="non-scaling-stroke" />
          <motion.path tabindex="-1" :initial="false" :animate="{ d: path }" :transition="{ duration: reduced ? 0 : 0.28, ease: easeOut }" fill="none" stroke="white" stroke-opacity="0.9" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
        </svg>
      </div>
      <div aria-hidden="true" class="x-axis"><span v-for="column in axisColumns" :key="column.id">{{ column.label }}</span></div>
    </div>
    <ChartTip :key="active ?? 'closed'" :id="tooltipId" :anchor="anchor" :follow-cursor="false" :open="selected !== null" @dismiss="activeRaw = null">
      <span v-if="selected" class="tip">
        <span class="muted">{{ selected.label }} · {{ formatPrice(prices[row]) }}</span>
        <span class="amount">
          <template v-if="size === undefined">{{ t('noData') }}</template>
          <NumberTicker v-else :value="size" :format="() => formatSize(size!)" :suffix="` ${unit}`" :duration="0.35" :start-on-view="false" />
        </span>
        <span v-if="selected.price !== undefined && Number.isFinite(selected.price)" class="muted">{{ t('market', { price: formatPrice(selected.price) }) }}</span>
      </span>
    </ChartTip>
  </div>
</template>

<style scoped>
.empty { margin: 0; padding: 64px 0; text-align: center; font-size: 14px; color: var(--beui-muted-foreground); }
.scroller { overflow-x: auto; }
.body { box-sizing: border-box; position: relative; padding-right: 72px; }
.grid-wrap { position: relative; }
.grid { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 2px; }
.grid td { padding: 0; }
.sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.cell { position: relative; display: block; width: 100%; height: 24px; margin: 0; padding: 0; border: 0; border-radius: 2px; background: color-mix(in srgb, var(--beui-muted) 30%, transparent); outline: none; cursor: crosshair; }
.cell:focus-visible { z-index: 10; box-shadow: 0 0 0 2px var(--beui-foreground); }
.fill { position: absolute; inset: 0; border-radius: 2px; pointer-events: none; }
.ring { position: absolute; inset: 0; border-radius: 2px; box-shadow: inset 0 0 0 1px #fff; pointer-events: none; }
.y-axis { position: absolute; top: 0; bottom: 0; right: -72px; display: flex; flex-direction: column; justify-content: space-around; width: 64px; text-align: right; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-size: 10px; line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.trace { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.x-axis { display: flex; justify-content: space-between; margin-top: 12px; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-size: 10px; line-height: 1.5; color: var(--beui-muted-foreground); }
.tip { display: flex; flex-direction: column; gap: 4px; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-size: 12px; }
.amount { display: inline-flex; align-items: center; font-variant-numeric: tabular-nums; }
.muted { color: var(--beui-muted-foreground); }
</style>

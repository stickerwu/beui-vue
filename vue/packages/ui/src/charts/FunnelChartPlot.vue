<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, useId } from 'vue'
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { easeOut } from '../core/motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { funnelPercentage as percentage, useFunnelChart } from './funnel-context'

const { rows, direction, unit, formatValue, t } = useFunnelChart()
const reduced = useReducedMotion()
const tooltipId = useId()
const current = shallowRef<string | null>(null)
const buttons = new Map<string, HTMLElement>()
const horizontal = computed(() => direction.value === 'horizontal')
const active = computed(() => rows.value.find(row => row.id === current.value))
const activeIndex = computed(() => rows.value.findIndex(row => row.id === current.value))

// Hover opens after 120ms (instant right after another tooltip closed); keyboard focus opens at once.
let timer: ReturnType<typeof setTimeout> | undefined
let lastClosed = 0
function open(id: string, wait = 0) {
  clearTimeout(timer)
  const show = () => { current.value = id }
  if (!wait || Date.now() - lastClosed < 300) show()
  else timer = setTimeout(show, wait)
}
function close() {
  clearTimeout(timer)
  if (current.value !== null) lastClosed = Date.now()
  current.value = null
}
function focus(event: FocusEvent, id: string) { if ((event.currentTarget as HTMLElement).matches(':focus-visible')) open(id) }
function enter(event: PointerEvent, id: string) { if (event.pointerType === 'mouse') open(id, 120) }
function tap(event: PointerEvent, id: string) { if (event.pointerType === 'touch') { if (current.value === id) close(); else open(id) } }
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <p v-if="!rows.length" class="empty">{{ t('empty') }}</p>
  <div v-else class="plot-wrap" data-slot="funnel-chart-plot">
    <div class="scroll">
      <div class="plot" :style="{ height: `${horizontal ? 300 : Math.max(320, rows.length * 72)}px`, minWidth: `${horizontal ? rows.length * 110 : 240}px` }">
        <svg aria-hidden="true" viewBox="0 0 1000 500" preserveAspectRatio="none">
          <motion.path v-for="stage in rows" :key="stage.id" tabindex="-1" :fill="stage.color" :initial="false" :animate="{ d: stage.path }" :transition="{ duration: reduced ? 0 : 0.28, ease: easeOut }" />
        </svg>
        <ol :aria-label="t('stages')" :style="horizontal ? { gridTemplateColumns: `repeat(${rows.length}, 1fr)` } : { gridTemplateRows: `repeat(${rows.length}, 1fr)` }">
          <li v-for="stage in rows" :key="stage.id">
            <button :ref="el => { if (el) buttons.set(stage.id, el as HTMLElement); else buttons.delete(stage.id) }" type="button"
              :aria-label="t('stage', { stage: stage.label, value: formatValue(stage.value), unit, percent: percentage(stage.conversion) })"
              :aria-describedby="current === stage.id ? tooltipId : undefined"
              @focus="focus($event, stage.id)" @blur="close" @pointerenter="enter($event, stage.id)" @pointerleave="close" @pointerup="tap($event, stage.id)" @keydown.esc="close">
              <span>{{ formatValue(stage.value) }}</span>
            </button>
          </li>
        </ol>
      </div>
    </div>
    <ChartTip :id="tooltipId" :open="active !== undefined" :anchor="active ? buttons.get(active.id) ?? null : null" :follow-cursor="false" side="top" @dismiss="close">
      <span v-if="active" :key="active.id" class="funnel-tip">
        <span class="muted">{{ active.label }}</span>
        <NumberTicker :value="active.value" :format="() => formatValue(active!.value)" :suffix="` ${unit}`" :duration="0.35" :start-on-view="false" class-name="mono" />
        <template v-if="activeIndex > 0">
          <span>{{ t('fromPrevious', { percent: percentage(active.step) }) }}</span>
          <span class="muted">{{ t((active.change ?? 0) > 0 ? 'gained' : 'dropped', { value: formatValue(Math.abs(active.change ?? 0)) }) }}</span>
        </template>
        <span class="muted">{{ t('ofStart', { percent: percentage(active.conversion) }) }}</span>
      </span>
    </ChartTip>
    <div class="legend">
      <span v-for="stage in rows" :key="stage.id" class="key"><span class="dot" aria-hidden="true" :style="{ backgroundColor: stage.color }" /><span>{{ stage.label }}</span><span class="pct">{{ percentage(stage.conversion) }}</span></span>
    </div>
  </div>
</template>

<style scoped>
.empty { margin: 0; padding: 64px 0; text-align: center; font-size: 14px; line-height: 20px; color: var(--beui-muted-foreground); }
.plot-wrap { display: flex; flex-direction: column; gap: 20px; }
.scroll { overflow-x: auto; }
.plot { position: relative; }
.plot svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.plot ol { position: absolute; inset: 0; display: grid; margin: 0; padding: 0; list-style: none; }
.plot li { min-width: 0; min-height: 0; margin: 0; }
.plot button { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; outline: none; transition: background-color .15s; }
.plot button:hover { background: color-mix(in srgb, var(--beui-foreground) 5%, transparent); }
.plot button:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
.plot button span { padding: 4px 8px; border-radius: 4px; background: color-mix(in srgb, var(--beui-background) 85%, transparent); font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 12px; line-height: 16px; font-weight: 500; font-variant-numeric: tabular-nums; }
.legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px 24px; }
.key { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; line-height: 16px; }
.dot { flex: none; width: 8px; height: 8px; border-radius: 50%; }
.pct { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 10px; line-height: calc(4 / 3); color: var(--beui-muted-foreground); }
</style>

<!-- Tooltip content is teleported to the body, so its rules cannot be scoped. -->
<style>
.chart-tip .funnel-tip { display: flex; flex-direction: column; gap: 6px; font-size: 12px; line-height: calc(4 / 3); padding: 2px 0; }
.chart-tip .funnel-tip .muted { color: var(--beui-muted-foreground); }
.chart-tip .funnel-tip .mono { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); }
</style>

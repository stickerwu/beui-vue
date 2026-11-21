<script setup lang="ts">
/* The ring sweeps in once it scrolls into view: it turns from -90deg and grows while segments fade in clockwise,
 * 60ms apart. Hovering a segment, or focusing its legend item, pops it outward from the ring's centre and fades
 * the rest. Everything animates transform and opacity. Hover is read from static hit arcs, so a popping segment
 * never slides out from under the pointer and toggles itself. Reduced motion: the ring appears in place and
 * emphasis changes without easing. */
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { AnimatePresence, motion, useInView } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import DigitSwap from '../numeric/DigitSwap.vue'
import { easeOut, layoutSpring } from '../core/motion'
import { useHoverCapable } from './plot-utils'

interface Segment { id: string; name: string; color: string; value: number }

const SIZE = 200
const CENTER = SIZE / 2
/** Scale around the ring's centre rather than each arc's own box. */
const RING_ORIGIN = { transformBox: 'view-box', transformOrigin: `${CENTER}px ${CENTER}px` } as const

const props = withDefaults(defineProps<{
  segments: readonly Segment[]
  /** Ring thickness in viewBox units; the chart is 200 wide. */
  thickness?: number
  /** Degrees of empty space between neighbouring segments. */
  gap?: number
  activeId?: string | null
  defaultActiveId?: string | null
  selectedId?: string | null
  label?: string
  labels?: { label?: string; total?: string }
  formatValue?: (value: number) => string
}>(), { thickness: 22, gap: 3 })
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null]; select: [id: string] }>()

const reduce = useReducedMotion()
const canHover = useHoverCapable()
const format = (value: number) => (props.formatValue ?? ((v: number) => v.toLocaleString('en-US')))(value)
const internal = shallowRef(props.defaultActiveId ?? null)
const radius = computed(() => 100 - props.thickness / 2 - 8)

const point = (r: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180
  return [CENTER + r * Math.sin(radians), CENTER - r * Math.cos(radians)]
}
/** Clockwise from 12 o'clock as round-capped arcs, each shortened by the gap plus its own cap. */
const model = computed(() => {
  const valid = props.segments.filter(segment => Number.isFinite(segment.value) && segment.value > 0)
  const total = valid.reduce((sum, segment) => sum + segment.value, 0)
  const r = radius.value
  const capDegrees = ((props.thickness / 2) / r) * (180 / Math.PI)
  const single = valid.length === 1
  let cursor = 0
  const placed = valid.map(segment => {
    const share = total ? segment.value / total : 0
    const sweep = share * 360
    const inset = single ? 0 : props.gap / 2 + capDegrees
    const start = cursor + inset
    const end = Math.max(start + 0.01, cursor + sweep - inset)
    cursor += sweep
    let path: string
    if (single) {
      const [x1, y1] = point(r, 0)
      const [x2, y2] = point(r, 180)
      path = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2} A ${r} ${r} 0 1 1 ${x1} ${y1}`
    } else {
      const [x1, y1] = point(r, start)
      const [x2, y2] = point(r, end)
      path = `M ${x1} ${y1} A ${r} ${r} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}`
    }
    return { ...segment, share, path }
  })
  return { placed, total }
})
const placed = computed(() => model.value.placed)
const total = computed(() => model.value.total)
// Resolve during render by id; a segment that left the data clears focus.
const raw = computed(() => props.activeId === undefined ? internal.value : props.activeId)
const active = computed(() => raw.value !== null && placed.value.some(segment => segment.id === raw.value) ? raw.value : null)
const segment = computed(() => placed.value.find(item => item.id === active.value) ?? null)
function setActive(id: string | null) {
  if (props.activeId === undefined) internal.value = id
  emit('update:activeId', id)
  emit('activeChange', id)
}

const plot = useTemplateRef<HTMLElement>('plot')
const inView = useInView(plot, { once: true, amount: 0.4 })
const shown = computed(() => Boolean(reduce.value) || inView.value)
// Stagger segments only for the first sweep, not when emphasis clears.
const entered = shallowRef(false)

// Roll digits in the direction the value moved.
const value = computed(() => segment.value?.value ?? total.value)
const direction = shallowRef<'up' | 'down'>('up')
watch(value, (next, prev) => { direction.value = next > prev ? 'up' : 'down' }, { flush: 'sync' })

function step(event: KeyboardEvent, index: number) {
  const offset = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
  if (!offset) return
  event.preventDefault()
  const rows = (event.currentTarget as HTMLElement).closest('ul')?.querySelectorAll<HTMLButtonElement>('[data-donut-legend]')
  rows?.[(index + offset + placed.value.length) % placed.value.length]?.focus()
}
</script>

<template>
  <div class="donut-chart" data-slot="donut-chart">
    <div class="layout">
      <div ref="plot" class="plot">
        <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" role="img" :aria-label="label ?? labels?.label ?? 'Donut chart'" class="svg">
          <circle :cx="CENTER" :cy="CENTER" :r="radius" fill="none" :stroke-width="thickness" class="track" opacity="0.6" />
          <motion.g tabindex="-1" :style="RING_ORIGIN" :initial="reduce ? false : { rotate: -90, scale: 0.88, opacity: 0 }" :animate="shown ? { rotate: 0, scale: 1, opacity: 1 } : undefined"
            :transition="{ duration: 0.9, ease: easeOut }" @animation-complete="entered = true">
            <motion.path v-for="(item, index) in placed" :key="item.id" tabindex="-1" :d="item.path" fill="none" :stroke="item.color" :stroke-width="thickness" stroke-linecap="round" :style="RING_ORIGIN"
              :initial="reduce ? false : { opacity: 0 }"
              :animate="shown ? { opacity: active !== null && active !== item.id ? 0.3 : 1, scale: active === item.id ? 1.05 : 1 } : undefined"
              :transition="reduce ? { duration: 0 } : { opacity: { duration: 0.4, ease: easeOut, delay: entered ? 0 : 0.15 + index * 0.06 }, scale: layoutSpring }"
              pointer-events="none" aria-hidden="true" />
          </motion.g>
          <!-- Static, slightly wider hit arcs own hover. They never scale, so the pointer stays on the same segment while its visual pops. -->
          <g>
            <path v-for="item in placed" :key="item.id" :d="item.path" fill="none" stroke="transparent" :stroke-width="thickness + 8" stroke-linecap="round"
              :pointer-events="shown ? 'stroke' : 'none'" style="cursor: pointer" @pointerenter="canHover && setActive(item.id)" @pointerleave="canHover && setActive(null)" />
          </g>
        </svg>
        <div class="hole">
          <slot name="center" :segment="segment" :total="total">
            <div aria-live="polite" class="center">
              <p class="amount"><DigitSwap :value="format(value)" :direction="direction" /></p>
              <div class="caption-clip">
                <AnimatePresence :initial="false" mode="popLayout">
                  <motion.p :key="segment?.id ?? 'total'" tabindex="-1" :initial="reduce ? { opacity: 0 } : { opacity: 0, y: '100%' }" :animate="{ opacity: 1, y: '0%' }"
                    :exit="reduce ? { opacity: 0 } : { opacity: 0, y: '-100%' }" :transition="{ duration: reduce ? 0.12 : 0.22, ease: easeOut }" class="caption">
                    <template v-if="segment">
                      <span aria-hidden="true" class="caption-dot" :style="{ backgroundColor: segment.color }" />
                      <span class="caption-text">{{ segment.name }} · {{ (segment.share * 100).toFixed(1) }}%</span>
                    </template>
                    <template v-else>{{ labels?.total ?? 'Total' }}</template>
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </slot>
        </div>
      </div>
      <ul class="legend">
        <li v-for="(item, index) in placed" :key="item.id">
          <button type="button" data-donut-legend class="row" :class="{ focused: active === item.id, selected: selectedId === item.id }"
            :aria-pressed="selectedId === undefined ? undefined : selectedId === item.id" @click="emit('select', item.id)"
            @pointerenter="canHover && setActive(item.id)" @pointerleave="canHover && setActive(null)" @focus="setActive(item.id)" @blur="setActive(null)" @keydown="step($event, index)">
            <span class="line">
              <span aria-hidden="true" class="swatch" :style="{ backgroundColor: item.color }" />
              <span class="name">{{ item.name }}</span>
              <span class="figures"><span class="pct">{{ (item.share * 100).toFixed(1) }}%</span><span class="amt">{{ format(item.value) }}</span></span>
            </span>
            <span aria-hidden="true" class="track-bar">
              <motion.span tabindex="-1" class="fill" :style="{ backgroundColor: item.color }" :initial="reduce ? false : { scaleX: 0 }" :animate="{ scaleX: item.share }"
                :transition="reduce ? { duration: 0 } : { ...layoutSpring, delay: 0.2 + index * 0.06 }" />
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.donut-chart { width: 100%; }
.layout { display: grid; align-items: center; gap: 24px; }
@media (min-width: 640px) { .layout { grid-template-columns: minmax(0, var(--donut-plot-width, 16rem)) minmax(0, 1fr); } }
.plot { position: relative; margin-inline: auto; aspect-ratio: 1 / 1; width: 100%; max-width: 16rem; }
.svg { width: 100%; height: 100%; overflow: visible; }
.track { stroke: var(--beui-muted); }
.hole { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
.center { position: relative; max-width: 56%; }
.amount { margin: 0; font-size: 24px; line-height: 32px; font-weight: 500; letter-spacing: -0.025em; font-variant-numeric: tabular-nums; }
.caption-clip { position: relative; margin-top: 4px; height: 16px; overflow: hidden; }
.caption { margin: 0; display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; font-size: 12px; line-height: 16px; color: var(--beui-muted-foreground); }
.caption-dot { width: 8px; height: 8px; flex: none; border-radius: 9999px; }
.caption-text { overflow: hidden; text-overflow: ellipsis; }
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
.track-bar { display: block; height: 4px; margin: 8px 0 0 22px; overflow: hidden; border-radius: 9999px; background: var(--beui-muted); }
.fill { display: block; height: 100%; transform-origin: left; border-radius: 9999px; }
:global(.dark .donut-chart .row:focus-visible) { box-shadow: 0 0 0 2px rgb(255 255 255 / 10%); }
</style>

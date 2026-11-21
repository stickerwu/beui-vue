<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const volumeProfileMessages = {
  label: 'Volume profile', unit: 'units', empty: 'No volume data', inspect: '{label}: inspect price level', caption: '{label} data',
  priceRange: 'Price range', volume: 'Volume ({unit})', share: 'Share', level: 'Level', range: '{low} to {high}', amount: '{volume} {unit}',
  shareOfTotal: '{share} of total volume', poc: 'Point of control', pocBadge: 'POC', inside: 'Inside value area', outside: 'Outside value area',
  totalVolume: 'Total volume', valueArea: 'Value area · {target}% target', shareOfVolume: '{share} of volume',
}
const format = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 2 })
</script>

<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, shallowRef, useId, useTemplateRef, watchEffect } from 'vue'
import { easeOut, layoutSpring } from '../core/motion'
import NumberTicker from '../numeric/NumberTicker.vue'
import ChartTip from './ChartTip.vue'
import { buildVolumeProfile, type VolumeProfileBin, type VolumeProfileRow } from './models/volume-profile'
import { interpolate, SR_ONLY, useHoverCapable } from './plot-utils'


const props = withDefaults(defineProps<{
  data: readonly VolumeProfileBin[]; label?: string; unit?: string; formatPrice?: (price: number) => string; formatVolume?: (size: number) => string
  valueArea?: number | false; color?: string; pocColor?: string; activeId?: string | null; defaultActiveId?: string | null; labels?: Partial<typeof volumeProfileMessages>
  /** Classes for the plot row; it defaults to 20rem tall. */
  plotClass?: string; showAxes?: boolean
}>(), { valueArea: 0.7, color: '#6366f1', pocColor: '#f59e0b', formatPrice: format, formatVolume: format, showAxes: true, activeId: undefined })
const emit = defineEmits<{ 'update:activeId': [id: string | null]; activeChange: [id: string | null] }>()

const t = (key: keyof typeof volumeProfileMessages, values?: Record<string, string | number>) => interpolate(props.labels?.[key] ?? volumeProfileMessages[key], values)
const title = computed(() => props.label ?? t('label'))
const unit = computed(() => props.unit ?? t('unit'))
const model = computed(() => buildVolumeProfile(props.data, props.valueArea))
const rows = computed(() => model.value.rows)
const reduce = useReducedMotion()
const canHover = useHoverCapable()
const plot = useTemplateRef<HTMLElement>('plot')
const tooltipId = useId()

const local = shallowRef(props.defaultActiveId ?? null)
const open = shallowRef(false)
const requested = computed(() => props.activeId === undefined ? local.value : props.activeId)
const activeIndex = computed(() => rows.value.findIndex(row => row.id === requested.value))
const active = computed(() => rows.value[activeIndex.value] ?? null)
const index = computed(() => Math.max(activeIndex.value, 0))
const row = computed(() => rows.value[index.value])
watchEffect(() => { if (local.value !== null && !rows.value.some(item => item.id === local.value)) local.value = null })
function setActive(id: string | null) {
  if (requested.value === id) return
  if (props.activeId === undefined) local.value = id
  emit('update:activeId', id)
  emit('activeChange', id)
}
function describe(item: VolumeProfileRow) {
  return [
    t('range', { low: props.formatPrice(item.priceLow), high: props.formatPrice(item.priceHigh) }),
    t('amount', { volume: props.formatVolume(item.volume), unit: unit.value }),
    t('shareOfTotal', { share: `${(item.share * 100).toFixed(1)}%` }),
    item.isPoc ? t('poc') : item.inValueArea ? t('inside') : null,
  ].filter(Boolean).join('. ')
}

let pointerDriven = false
let focused = false
let lastPointerId: string | null = null
function inspect(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  if (!bounds.height) return
  const fraction = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
  // Hit-test real price geometry, including unequal bins and empty price gaps.
  const match = rows.value.find(item => fraction >= item.top && fraction <= item.top + item.height)
    ?? rows.value.reduce((nearest, item) => Math.abs(item.center - fraction) < Math.abs(nearest.center - fraction) ? item : nearest)
  setActive(match.id)
  if (lastPointerId !== match.id) open.value = true
  lastPointerId = match.id
}
function onFocus() {
  focused = true
  if (!pointerDriven) { setActive(row.value.id); open.value = true }
}
function onBlur() { focused = false; pointerDriven = false; open.value = false }
function onEnter(event: PointerEvent) { if (canHover.value && event.pointerType !== 'touch') inspect(event) }
function onMove(event: PointerEvent) {
  if (event.pointerType === 'touch' ? event.buttons === 1 : canHover.value || event.buttons === 1) inspect(event)
}
function onLeave() { lastPointerId = null; if (!focused || pointerDriven) open.value = false }
function onDown(event: PointerEvent) { pointerDriven = true; lastPointerId = null; inspect(event) }
function onCancel() { pointerDriven = false; open.value = false }
function onKeydown(event: KeyboardEvent) {
  pointerDriven = false
  if (event.key === 'Escape') open.value = false
  else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    if (activeIndex.value < 0) setActive(row.value.id)
    open.value = true
  }
}
function onChange(event: Event) {
  if (pointerDriven) return
  const next = rows.value[Number((event.target as HTMLInputElement).value)]
  if (next) { setActive(next.id); open.value = true }
}
const anchorPoint = computed(() => ({ x: active.value ? Math.max(0.1, active.value.proportion / 2) : 0.5, y: active.value?.center ?? 0.5 }))
const levelOf = (item: VolumeProfileRow) => item.isPoc ? t('poc') : item.inValueArea ? t('inside') : model.value.valueArea ? t('outside') : '—'
const axis = computed(() => [1, 0.75, 0.5, 0.25, 0].map(position => ({ position, text: props.formatPrice(model.value.priceLow + (model.value.priceHigh - model.value.priceLow) * position) })))
const barOpacity = (item: VolumeProfileRow) => item.isPoc || item.inValueArea || !props.valueArea ? 0.9 : 0.3
</script>

<template>
  <section class="profile" data-slot="volume-profile" :aria-label="title">
    <p v-if="!rows.length" class="empty" :class="plotClass">{{ t('empty') }}</p>
    <div v-else data-slot="volume-profile-plot" class="plot-wrap" :class="{ axes: showAxes }">
      <div class="plot-row" :class="plotClass">
        <div v-if="showAxes" aria-hidden="true" class="y-axis">
          <span v-for="tick in axis" :key="tick.position"><span class="spacer">{{ tick.text }}</span><span class="tick" :style="{ top: `${(1 - tick.position) * 100}%` }">{{ tick.text }}</span></span>
        </div>
        <div ref="plot" class="plot">
          <div aria-hidden="true" class="layers">
            <span v-for="position in [0, 0.25, 0.5, 0.75, 1]" :key="position" class="grid" :style="{ left: `${position * 100}%` }" />
            <div v-for="(item, i) in rows" :key="item.id" :data-volume-bin="item.id" :data-poc="item.isPoc || undefined" :data-value-area="item.inValueArea || undefined" class="bin" :style="{ top: `${item.top * 100}%`, height: `${item.height * 100}%` }">
              <motion.div class="bar" :style="{ backgroundColor: item.isPoc ? pocColor : color, transformOrigin: 'left' }"
                :initial="{ opacity: 0, scaleX: item.proportion }" :animate="{ opacity: barOpacity(item), scaleX: item.proportion }"
                :transition="{ scaleX: reduce ? { duration: 0 } : layoutSpring, opacity: { duration: 0.18, ease: easeOut } }" />
              <motion.div class="sheen" :initial="false" :animate="{ opacity: open && activeIndex === i ? 1 : 0 }" :transition="{ duration: 0.1, ease: easeOut }" />
              <span v-if="item.isPoc" class="poc-line" :style="{ borderColor: pocColor }"><span class="poc-badge">{{ t('pocBadge') }}</span></span>
            </div>
          </div>
          <input type="range" :min="0" :max="rows.length - 1" :step="1" :value="index" :aria-label="t('inspect', { label: title })" aria-orientation="vertical"
            :aria-valuetext="describe(row)" :aria-describedby="open && activeIndex >= 0 ? tooltipId : undefined" class="inspector"
            @focus="onFocus" @blur="onBlur" @pointerenter="onEnter" @pointermove="onMove" @pointerleave="onLeave" @pointerdown="onDown" @pointercancel="onCancel" @click="pointerDriven = false"
            @keydown="onKeydown" @input="onChange" />
          <div v-if="showAxes" aria-hidden="true" class="x-axis"><span>0</span><span>{{ formatVolume(model.maxVolume / 2) }}</span><span>{{ formatVolume(model.maxVolume) }}</span></div>
        </div>
      </div>
    </div>
    <ChartTip v-if="rows.length" :id="tooltipId" :anchor="plot" :anchor-point="anchorPoint" :open="open && active !== null" @dismiss="open = false">
      <span v-if="active" class="tip">
        <span class="range"><span class="mono"><NumberTicker :value="active.priceLow" :format="() => formatPrice(active!.priceLow)" :start-on-view="false" :duration="0.2" :stagger="0" /></span><span>–</span><span class="mono"><NumberTicker :value="active.priceHigh" :format="() => formatPrice(active!.priceHigh)" :start-on-view="false" :duration="0.2" :stagger="0" /></span></span>
        <span class="amount"><span class="mono"><NumberTicker :value="active.volume" :format="() => formatVolume(active!.volume)" :start-on-view="false" :duration="0.2" :stagger="0" /></span> {{ unit }}
          <span class="muted">·<span class="mono"><NumberTicker :value="active.share * 100" :format="() => `${(active!.share * 100).toFixed(1)}%`" :start-on-view="false" :duration="0.2" :stagger="0" /></span></span></span>
        <span v-if="active.isPoc || active.inValueArea" class="muted">{{ active.isPoc ? t('poc') : t('inside') }}</span>
      </span>
    </ChartTip>
    <dl v-if="rows.length" class="summary">
      <div><dt>{{ t('totalVolume') }}</dt><dd class="mono strong">{{ t('amount', { volume: formatVolume(model.totalVolume), unit }) }}</dd></div>
      <div><dt><span aria-hidden="true" class="dot" :style="{ backgroundColor: pocColor }" />{{ t('poc') }}</dt><dd class="mono strong">{{ model.poc ? formatPrice(model.poc.price) : '—' }}</dd></div>
      <div v-if="model.valueArea" class="wide"><dt><span aria-hidden="true" class="dot" :style="{ backgroundColor: color }" />{{ t('valueArea', { target: Math.round(model.valueArea.target * 100) }) }}</dt>
        <dd class="mono strong">{{ formatPrice(model.valueArea.priceLow) }} – {{ formatPrice(model.valueArea.priceHigh) }}</dd>
        <dd class="muted">{{ t('shareOfVolume', { share: `${(model.valueArea.share * 100).toFixed(1)}%` }) }}</dd></div>
    </dl>
    <div :style="SR_ONLY"><table><caption>{{ t('caption', { label: title }) }}</caption>
      <thead><tr><th scope="col">{{ t('priceRange') }}</th><th scope="col">{{ t('volume', { unit }) }}</th><th scope="col">{{ t('share') }}</th><th scope="col">{{ t('level') }}</th></tr></thead>
      <tbody><tr v-for="item in rows" :key="item.id"><th scope="row">{{ t('range', { low: formatPrice(item.priceLow), high: formatPrice(item.priceHigh) }) }}</th><td>{{ formatVolume(item.volume) }}</td><td>{{ (item.share * 100).toFixed(1) }}%</td><td>{{ levelOf(item) }}</td></tr></tbody></table></div>
  </section>
</template>

<style scoped>
.profile { display: flex; flex-direction: column; gap: 20px; width: 100%; min-width: 0; }
.empty { margin: 0; padding: 48px 0; text-align: center; font-size: 14px; color: var(--beui-muted-foreground); }
.plot-wrap { min-width: 0; }
.plot-wrap.axes { padding-bottom: 24px; }
.plot-row { display: flex; gap: 12px; min-width: 0; height: 20rem; }
.y-axis { position: relative; flex: none; text-align: right; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-size: 12px; line-height: 16px; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.spacer { display: block; visibility: hidden; }
.tick { position: absolute; right: 0; transform: translateY(-50%); }
@media (max-width: 639px) { .y-axis, .x-axis { font-size: 10px; } }
.plot { position: relative; flex: 1; min-width: 0; border-radius: 2px; }
.plot:has(:focus-visible) { outline: 2px solid var(--beui-ring); outline-offset: 4px; }
.layers { position: absolute; inset: 0; pointer-events: none; }
.grid { position: absolute; top: 0; bottom: 0; border-left: 1px solid color-mix(in srgb, var(--beui-border) 60%, transparent); }
.bin { position: absolute; left: 0; right: 0; overflow: hidden; padding-block: 1px; box-sizing: border-box; }
.bar { width: 100%; height: 100%; border-radius: 0 2px 2px 0; }
.sheen { position: absolute; inset: 0; background: color-mix(in srgb, var(--beui-foreground) 5%, transparent); }
.poc-line { position: absolute; left: 0; right: 0; top: 50%; border-top: 1px dashed; }
.poc-badge { position: absolute; right: 0; transform: translateY(-50%); padding: 2px 6px; border-radius: 4px; background: var(--beui-background); color: var(--beui-foreground); font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-size: 10px; line-height: 16px; font-weight: 500; }
.inspector { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: crosshair; writing-mode: vertical-lr; direction: rtl; touch-action: pan-x; }
.x-axis { position: absolute; left: 0; right: 0; top: 100%; display: flex; justify-content: space-between; margin-top: 8px; font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); font-size: 12px; line-height: 16px; font-variant-numeric: tabular-nums; color: var(--beui-muted-foreground); }
.mono { font-family: var(--beui-font-mono, var(--font-mono, ui-monospace, monospace)); }
.muted { color: var(--beui-muted-foreground); }
.tip { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.range { display: inline-flex; align-items: center; gap: 4px; font-weight: 500; font-variant-numeric: tabular-nums; }
.amount { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.amount .muted { display: inline-flex; align-items: center; gap: 4px; }
.summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 0; padding-top: 16px; border-top: 1px solid var(--beui-border); font-size: 12px; line-height: 16px; }
.summary > div { display: flex; flex-direction: column; gap: 6px; }
.summary .wide { grid-column: span 2; }
@media (min-width: 640px) { .summary { grid-template-columns: repeat(3, minmax(0, 1fr)); } .summary .wide { grid-column: span 1; } }
.summary dt { display: flex; align-items: center; gap: 6px; color: var(--beui-muted-foreground); }
.summary dd { margin: 0; }
.strong { font-weight: 500; font-variant-numeric: tabular-nums; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
</style>

<script lang="ts">
/**
 * A draggable, horizontally paged timeline: one event card is centered and at
 * full size, its neighbours sit smaller and veiled beside it, tick groups mark
 * the gaps and year numerals drift behind everything at half the track speed.
 * Pointer drag, flick momentum, horizontal wheel, arrow keys, Home/End and a
 * click on any card all move the track.
 */

export type TimelineEvent = {
  /** Stable identity, used for `v-model` and list keys. */
  id: string
  /** ISO date string or Date. Read in UTC. */
  date: string | Date
  title: string
  /** Footer line under the media: a stat, a tag, a reaction count. */
  meta?: string
}

/** English defaults. Override per instance with `labels`. */
export const timelineMessages = {
  label: 'Timeline',
  hint: 'Use the left and right arrow keys to move between events.',
}
export type TimelineMessages = typeof timelineMessages
</script>

<script setup lang="ts">
import { animate, useMotionValue } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onBeforeUnmount, onMounted, onUpdated, shallowRef, useId, useSlots, useTemplateRef, watch } from 'vue'
import { capturePointer, releasePointer } from '../core/touch'

const props = withDefaults(defineProps<{
  events: readonly TimelineEvent[]
  /** Initially focused event id (uncontrolled). Defaults to the first event. */
  defaultValue?: string
  /** Card width in px at full size. Shrinks to fit narrow containers. */
  itemWidth?: number
  /** Stage height in px. */
  height?: number
  /** Large year numerals drifting behind the cards. */
  years?: boolean
  /** A group of ticks in each gap between cards. */
  ruler?: boolean
  /** Lines fanning from the top and bottom center to the cards near the center. */
  cables?: boolean
  formatDate?: (date: Date) => string
  formatYear?: (date: Date) => string
  /** BCP 47 tag for the card dates, mirroring the React `LocaleProvider`.
   * Without one the labels stay English ("Mar 4 ’24"). */
  locale?: string
  /** Accessible name of the stage. */
  label?: string
  /** Override any built-in string. */
  labels?: Partial<TimelineMessages>
  className?: string
}>(), { itemWidth: 340, height: 600, years: true, ruler: true, cables: true })

const model = defineModel<string>()
const emit = defineEmits<{ valueChange: [id: string] }>()
const slots = useSlots()
defineSlots<{
  media?(props: { event: TimelineEvent; index: number }): unknown
  meta?(props: { event: TimelineEvent }): unknown
}>()

// Uncontrolled state lives in the model itself: `v-model` writes it from
// outside, and a plain `defaultValue` seeds the first frame.
const activeId = computed(() => model.value ?? props.defaultValue)

const t = computed(() => ({ ...timelineMessages, ...props.labels }))
const ariaLabel = computed(() => props.label ?? t.value.label)

// Timeline-specific: a release spring that takes the flick velocity, so the
// track coasts on past the finger and settles onto an event without a step.
const GLIDE_SPRING = { stiffness: 120, damping: 24, mass: 1 } as const

// Projected events per unit of release velocity (events/s), capped.
const FLICK_MOMENTUM = 0.3
const MAX_FLICK_EVENTS = 4

// Pointer travel before a press becomes a drag. Below it the press is a click.
const DRAG_THRESHOLD = 4

// Past either end the track follows the pointer at this fraction.
const RUBBER_BAND = 0.3

// Neighbours rest at this scale, veiled by SIDE_DIM; the focused event sits
// at full strength. The card is dimmed by a veil in the stage colour rather
// than by opacity, so it stays solid and nothing behind shows through it.
const SIDE_SCALE = 0.72
const SIDE_DIM = 0.45

// Year numerals drift at this fraction of the track speed, so they read as a
// far layer behind the cards.
const YEAR_PARALLAX = 0.5

// Gap above the year numerals, as a fraction of their font size.
const YEAR_INSET = 0.33

// Cards sit on the stage middle, between two equal bands: the top one holds
// the year numerals, and each holds the apex one fan of cables leaves from.
const CARD_CENTER = 0.5

// Each gap between cards holds a group of ticks: GAP_TICKS lines spread over
// GAP_TICK_SPAN of the gap, the middle one taller and brighter. Heights are
// fractions of the card width so the group scales with the cards.
const GAP_TICKS = 5
const GAP_TICK_SPAN = 0.7
const TICK_SHORT = 0.13
const TICK_TALL = 0.2

// Cables reach this far across a card's half-width, so they meet its top edge
// just inside the corners.
const CABLE_REACH = 0.8
// Only the centered card and its two neighbours carry cables: full strength
// out to CABLE_HOLD events from the center, gone by CABLE_FADE, so the fan
// stays at six lines however many events there are.
const CABLE_HOLD = 1
const CABLE_FADE = 1.6

// Horizontal wheel idle time before the track snaps to the nearest event.
const WHEEL_SETTLE = 140

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' })

const toDate = (date: string | Date) => (typeof date === 'string' ? new Date(date) : date)
const defaultFormatYear = (date: Date) => `’${String(date.getUTCFullYear()).slice(-2)}`
const defaultFormatDate = (date: Date) => `${MONTH.format(date)} ${date.getUTCDate()} ${defaultFormatYear(date)}`

const uid = useId()
const hintId = `${uid}-hint`

const reduce = useReducedMotion()

const count = computed(() => props.events.length)
const last = computed(() => Math.max(0, count.value - 1))

// Resolved during render: an unknown or removed id falls back to the first
// event, so there is always exactly one tab stop.
const activeIndex = computed(() => {
  const found = props.events.findIndex(event => event.id === activeId.value)
  return found === -1 ? 0 : found
})

const dates = computed(() => props.events.map(event => toDate(event.date)))

// Without a locale keep the English "Mar 4 ’24" so server and client match.
const formatDateLabel = computed<(date: Date) => string>(() => {
  if (props.formatDate) return props.formatDate
  if (!props.locale) return defaultFormatDate
  const format = new Intl.DateTimeFormat(props.locale, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
  return (date: Date) => format.format(date)
})

const formatYearLabel = (date: Date) => props.formatYear?.(date) ?? defaultFormatYear(date)

// One numeral per year, centered on the boundary where that year begins.
const yearMarks = computed(() => {
  const marks: { key: string; label: string; position: number }[] = []
  let previous: number | null = null
  dates.value.forEach((date, index) => {
    const year = date.getUTCFullYear()
    if (year === previous) return
    previous = year
    marks.push({ key: String(year), label: formatYearLabel(date), position: index === 0 ? 0 : index - 0.5 })
  })
  return marks
})

// --- Layout ---------------------------------------------------------------
const stage = useTemplateRef<HTMLElement>('stage')
const width = shallowRef(0)
let observer: ResizeObserver | undefined

const stageWidth = computed(() => width.value || 800)
// About a third of the stage at most, so each neighbour shows in full or
// nearly beside the focused card; phones give the card more of the width
// and keep a sliver of each neighbour.
const cardWidth = computed(() => Math.min(props.itemWidth, stageWidth.value * (stageWidth.value < 640 ? 0.58 : 0.36)))
// One gap everywhere: between the focused card and its neighbours, and
// between every pair of smaller cards further out. Wide enough to hold the
// tick group between cards.
const gap = computed(() => clamp(cardWidth.value * 0.22, 40, 72))
const step = computed(() => cardWidth.value * SIDE_SCALE + gap.value)
const near = computed(() => (cardWidth.value * (1 + SIDE_SCALE)) / 2 + gap.value)
const halfWidth = computed(() => stageWidth.value / 2)

const yearFontSize = computed(() => props.height * 0.2)
const yearTop = computed(() => yearFontSize.value * YEAR_INSET)
const tickGap = computed(() => (gap.value * GAP_TICK_SPAN) / (GAP_TICKS - 1) - 1)
const middleTick = (GAP_TICKS - 1) / 2

// --- Track position -------------------------------------------------------
// Track position in events (continuous); event i is centered at scroll = i.
const scroll = useMotionValue(activeIndex.value)

/** Card center relative to the stage center. Over the first step a card
 * travels `near`, which leaves the same gap beside the bigger focused card
 * as between the smaller cards further out, one `step` apart. */
function cardX(o: number) {
  const a = Math.abs(o)
  return Math.sign(o) * (a <= 1 ? a * near.value : near.value + (a - 1) * step.value)
}

function cardScale(o: number) {
  return 1 - (1 - SIDE_SCALE) * Math.min(Math.abs(o), 1)
}

// Nearer the center paints on top, so a card arriving at the center slides
// over the one leaving mid-drag.
const cardZ = (o: number) => 100 - Math.round(Math.abs(o) * 10)
const cardVeil = (o: number) => SIDE_DIM * Math.min(Math.abs(o), 1)

function cableReach(o: number) {
  return (cardWidth.value / 2) * cardScale(o) * CABLE_REACH
}

/** Left and right ends of one card's four cables: the near corners of the
 * card, out from the stage center by the track offset. */
function cableEdges(o: number) {
  const center = halfWidth.value + cardX(o)
  const reach = cableReach(o)
  return { left: center - reach, right: center + reach }
}

const cableOpacity = (o: number) => clamp((CABLE_FADE - Math.abs(o)) / (CABLE_FADE - CABLE_HOLD), 0, 1)

/** The tick group in the gap after card `index`. It sits midway between that
 * card's right edge and the next card's left edge; the gap keeps one width
 * while the cards move, so the group only translates. */
function tickX(index: number, s: number) {
  const o = index - s
  const right = cardX(o) + (cardWidth.value * cardScale(o)) / 2
  const left = cardX(o + 1) - (cardWidth.value * cardScale(o + 1)) / 2
  return (right + left) / 2
}

const yearX = (position: number, s: number) => (position - s) * step.value * YEAR_PARALLAX

// Values as rendered: the current track position is read when the component
// renders, so prerendered markup is already laid out before the first
// imperative paint.
const offsetAt = (index: number) => index - scroll.get()
const cableOpacityAt = (index: number) => cableOpacity(offsetAt(index))
const cableEdgesAt = (index: number) => cableEdges(offsetAt(index))
const yearXAt = (position: number) => yearX(position, scroll.get())
const tickXAt = (index: number) => tickX(index, scroll.get())

function cardStyle(index: number) {
  const o = offsetAt(index)
  return {
    width: `${cardWidth.value}px`,
    marginLeft: `${-cardWidth.value / 2}px`,
    transform: `translateX(${cardX(o)}px) scale(${cardScale(o)})`,
    zIndex: String(cardZ(o)),
    '--veil-opacity': String(cardVeil(o)),
  }
}

const hasMeta = (event: TimelineEvent) => Boolean(event.meta) || Boolean(slots.meta)

// --- Painted layers -------------------------------------------------------
// The track position is a MotionValue, so cards, numerals, ticks and cables
// follow it by writing straight to the DOM rather than re-rendering each
// frame. The layers are re-measured whenever a render may have changed them.
type Layers = {
  cards: HTMLElement[]
  years: { node: HTMLElement; position: number }[]
  ticks: HTMLElement[]
  cables: { group: SVGGElement; lines: SVGLineElement[] }[]
}
let layers: Layers | null = null

function measureLayers(): Layers | null {
  const root = stage.value
  if (!root) return null
  return {
    cards: Array.from(root.querySelectorAll<HTMLElement>('[data-slot="timeline-event"]')),
    years: Array.from(root.querySelectorAll<HTMLElement>('[data-year-position]')).map(node => ({
      node,
      position: Number(node.dataset.yearPosition),
    })),
    ticks: Array.from(root.querySelectorAll<HTMLElement>('[data-ticks]')),
    cables: Array.from(root.querySelectorAll<SVGGElement>('[data-cables]')).map(group => ({
      group,
      lines: Array.from(group.querySelectorAll('line')),
    })),
  }
}

function paint() {
  if (!stage.value) return
  const current = layers ?? (layers = measureLayers())
  if (!current) return
  const s = scroll.get()
  current.cards.forEach((node, index) => {
    const o = index - s
    node.style.transform = `translateX(${cardX(o)}px) scale(${cardScale(o)})`
    node.style.zIndex = String(cardZ(o))
    node.style.setProperty('--veil-opacity', String(cardVeil(o)))
  })
  current.cables.forEach(({ group, lines }, index) => {
    const o = index - s
    const { left, right } = cableEdges(o)
    group.style.opacity = String(cableOpacity(o))
    lines[0]?.setAttribute('x2', String(left))
    lines[1]?.setAttribute('x2', String(right))
    lines[2]?.setAttribute('x2', String(left))
    lines[3]?.setAttribute('x2', String(right))
  })
  for (const { node, position } of current.years) {
    node.style.transform = `translateX(${yearX(position, s)}px)`
  }
  current.ticks.forEach((node, index) => {
    node.style.transform = `translateX(${tickX(index, s)}px)`
  })
}

// One paint per frame: a drag, a wheel burst and a glide all set the track
// value several times between frames, and only the last value is visible.
let paintQueued = false
function schedulePaint() {
  if (paintQueued) return
  paintQueued = true
  queueMicrotask(() => {
    paintQueued = false
    paint()
  })
}

function invalidateLayers() {
  layers = null
}

function select(index: number, focus = false) {
  const target = clamp(index, 0, last.value)
  glideTo(target)
  if (focus) focusButton(target)
}

function focusButton(index: number) {
  const buttons = stage.value?.querySelectorAll<HTMLButtonElement>('.be-timeline-hit')
  buttons?.[index]?.focus({ preventScroll: true })
}

// --- Moving the track -----------------------------------------------------
let glide: ReturnType<typeof animate> | null = null
// While a glide runs the target is already committed, so the track passing
// over the events in between must not hand focus back to them.
let gliding = false
let dragging = false

function stopGlide() {
  gliding = false
  glide?.stop()
  glide = null
}

function commit(index: number) {
  const event = props.events[index]
  if (!event || index === activeIndex.value) return
  model.value = event.id
  emit('valueChange', event.id)
}

function glideTo(to: number, velocity = scroll.getVelocity()) {
  stopGlide()
  commit(to)
  if (reduce.value) {
    scroll.set(to)
    return
  }
  gliding = true
  glide = animate(scroll, to, {
    type: 'spring',
    ...GLIDE_SPRING,
    velocity,
    restDelta: 0.001,
    onComplete: () => {
      gliding = false
      glide = null
    },
  })
}

function settle(velocity: number) {
  const projected = scroll.get() + clamp(velocity * FLICK_MOMENTUM, -MAX_FLICK_EVENTS, MAX_FLICK_EVENTS)
  glideTo(clamp(Math.round(projected), 0, last.value), velocity)
}

function onCardKeyDown(event: KeyboardEvent, index: number) {
  const next =
    event.key === 'ArrowRight'
      ? index + 1
      : event.key === 'ArrowLeft'
        ? index - 1
        : event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? last.value
            : null
  if (next === null) return
  event.preventDefault()
  select(next, true)
}

// Under a drag or wheel, focus follows the event nearest the center.
const offScroll = scroll.on('change', value => {
  if (!gliding) commit(clamp(Math.round(value), 0, last.value))
  schedulePaint()
})

// Follow a value changed from outside (controlled), or a list that shrank.
watch([activeIndex, last], () => {
  if (dragging || gliding) return
  if (clamp(Math.round(scroll.get()), 0, last.value) === activeIndex.value) return
  glideTo(activeIndex.value)
})

// --- Pointer gesture ------------------------------------------------------
const drag = {
  id: -1,
  startX: 0,
  startScroll: 0,
  moved: false,
  lastX: 0,
  lastT: 0,
  prevX: 0,
  prevT: 0,
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  stopGlide()
  const now = performance.now()
  drag.id = event.pointerId
  drag.startX = event.clientX
  drag.startScroll = scroll.get()
  drag.moved = false
  drag.lastX = event.clientX
  drag.lastT = now
  drag.prevX = event.clientX
  drag.prevT = now
  dragging = true
}

function onPointerMove(event: PointerEvent) {
  if (!dragging || event.pointerId !== drag.id) return
  const dx = event.clientX - drag.startX
  if (!drag.moved) {
    if (Math.abs(dx) < DRAG_THRESHOLD) return
    // Capture only once it is a drag, so a plain press still clicks the
    // card under it; after a drag the click lands on the stage instead.
    drag.moved = true
    const element = event.currentTarget as Element | null
    if (element) capturePointer(element, event.pointerId)
  }
  const raw = drag.startScroll - dx / step.value
  scroll.set(
    raw < 0
      ? raw * RUBBER_BAND
      : raw > last.value
        ? last.value + (raw - last.value) * RUBBER_BAND
        : raw,
  )
  drag.prevX = drag.lastX
  drag.prevT = drag.lastT
  drag.lastX = event.clientX
  drag.lastT = performance.now()
}

function onPointerUp(event: PointerEvent) {
  if (!dragging || event.pointerId !== drag.id) return
  dragging = false
  if (!drag.moved) return
  const element = event.currentTarget as Element | null
  if (element) releasePointer(element, event.pointerId)
  const dt = drag.lastT - drag.prevT
  const vpx = dt > 0 ? (drag.lastX - drag.prevX) / dt : 0 // px per ms
  settle((-vpx * 1000) / step.value) // events per second
}

// Horizontal wheel and trackpad swipes move the track; vertical wheel is
// left to the page. Native listener: the browser's own back-swipe must be
// preventable, which a passive listener cannot do.
let settleTimer: ReturnType<typeof setTimeout> | undefined
function onWheel(event: WheelEvent) {
  if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return
  event.preventDefault()
  stopGlide()
  scroll.set(clamp(scroll.get() + event.deltaX / step.value, -0.3, last.value + 0.3))
  window.clearTimeout(settleTimer)
  settleTimer = window.setTimeout(
    () => glideTo(clamp(Math.round(scroll.get()), 0, last.value), 0),
    WHEEL_SETTLE,
  )
}

onMounted(() => {
  const element = stage.value
  if (!element) return
  width.value = element.clientWidth
  observer = new ResizeObserver(entries => {
    width.value = entries[0]?.contentRect.width ?? element.clientWidth
  })
  observer.observe(element)
  element.addEventListener('wheel', onWheel, { passive: false })
  invalidateLayers()
  paint()
})

// Any render can add, remove or resize a layer; re-measure, then repaint.
onUpdated(() => {
  invalidateLayers()
  paint()
})

onBeforeUnmount(() => {
  offScroll()
  stopGlide()
  observer?.disconnect()
  stage.value?.removeEventListener('wheel', onWheel)
  window.clearTimeout(settleTimer)
  layers = null
})
</script>

<template>
  <section
    ref="stage"
    :aria-label="ariaLabel"
    :aria-describedby="hintId"
    :class="['be-timeline', className]"
    :style="{ height: `${height}px` }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <p :id="hintId" class="be-timeline-hint">{{ t.hint }}</p>

    <template v-if="years">
      <div
        v-for="mark in yearMarks"
        :key="mark.key"
        :data-year-position="mark.position"
        aria-hidden="true"
        class="be-timeline-year"
        :style="{ top: `${yearTop}px`, transform: `translateX(${yearXAt(mark.position)}px)` }"
      >
        <span class="be-timeline-year-label" :style="{ fontSize: `${yearFontSize}px` }">{{ mark.label }}</span>
      </div>
    </template>

    <svg v-if="cables" aria-hidden="true" class="be-timeline-cables" fill="none" :stroke-width="1">
      <g
        v-for="(event, index) in events"
        :key="event.id"
        data-cables
        :style="{ opacity: cableOpacityAt(index) }"
      >
        <line :x1="halfWidth" y1="0" :x2="cableEdgesAt(index).left" :y2="height * CARD_CENTER" />
        <line :x1="halfWidth" y1="0" :x2="cableEdgesAt(index).right" :y2="height * CARD_CENTER" />
        <line :x1="halfWidth" :y1="height" :x2="cableEdgesAt(index).left" :y2="height * CARD_CENTER" />
        <line :x1="halfWidth" :y1="height" :x2="cableEdgesAt(index).right" :y2="height * CARD_CENTER" />
      </g>
    </svg>

    <!-- The playhead: drawn over the cables so it reads as the line they hang
         from, bright from end to end and fading only at the stage edges. -->
    <div aria-hidden="true" class="be-timeline-playhead" />

    <template v-if="ruler">
      <div
        v-for="(event, index) in events.slice(0, -1)"
        :key="event.id"
        data-ticks
        aria-hidden="true"
        class="be-timeline-ticks"
        :style="{ top: `${CARD_CENTER * 100}%`, gap: `${tickGap}px`, transform: `translateX(${tickXAt(index)}px)` }"
      >
        <span
          v-for="tick in GAP_TICKS"
          :key="tick"
          class="be-timeline-tick"
          :data-middle="tick - 1 === middleTick || undefined"
          :style="{ height: `${cardWidth * (tick - 1 === middleTick ? TICK_TALL : TICK_SHORT)}px` }"
        />
      </div>
    </template>

    <ul class="be-timeline-list">
      <li
        v-for="(event, index) in events"
        :key="event.id"
        data-slot="timeline-event"
        :data-active="index === activeIndex || undefined"
        class="be-timeline-card"
        :style="cardStyle(index)"
      >
        <!-- One solid surface holds the label, media and meta, so the cables
             and ruler stop at its edge instead of showing through any part. -->
        <div class="be-timeline-card-inner">
          <div class="be-timeline-surface">
            <div class="be-timeline-head">
              <p :id="`${uid}-${index}-date`" class="be-timeline-date">{{ formatDateLabel(dates[index]!) }}</p>
              <h3 :id="`${uid}-${index}-title`" class="be-timeline-title">{{ event.title }}</h3>
            </div>
            <div class="be-timeline-media">
              <div class="be-timeline-media-frame">
                <slot name="media" :event="event" :index="index" />
              </div>
            </div>
            <div v-if="hasMeta(event)" class="be-timeline-meta">
              <slot name="meta" :event="event">{{ event.meta }}</slot>
            </div>
            <div v-else class="be-timeline-meta-empty" />
            <div aria-hidden="true" class="be-timeline-veil" />
          </div>
          <!-- Stretched over the whole card so the media stays valid content
               outside the button and remains readable on its own. -->
          <button
            type="button"
            :tabindex="index === activeIndex ? 0 : -1"
            :aria-current="index === activeIndex ? 'step' : undefined"
            :aria-labelledby="`${uid}-${index}-date ${uid}-${index}-title`"
            class="be-timeline-hit"
            @click="select(index)"
            @keydown="event => onCardKeyDown(event, index)"
          />
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
/* clip-path rather than overflow: it also clips composited layers. The whole
   stage fades at its edges together, so a card never turns see-through over
   the cables behind it. */
.be-timeline {
  position: relative;
  width: 100%;
  cursor: grab;
  touch-action: pan-y;
  overscroll-behavior-x: contain;
  clip-path: inset(0);
  mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
.be-timeline:active { cursor: grabbing; }

.be-timeline-hint {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.be-timeline-year { position: absolute; left: 50%; }
.be-timeline-year-label {
  display: block;
  translate: -50% 0;
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, var(--beui-foreground) 6%, transparent);
}

.be-timeline-cables {
  pointer-events: none;
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  stroke: color-mix(in srgb, var(--beui-foreground) 14%, transparent);
  mask-image: linear-gradient(to bottom, transparent, black 6%, black 94%, transparent);
}

.be-timeline-playhead {
  pointer-events: none;
  position: absolute;
  inset-block: 0;
  left: 50%;
  width: 1px;
  translate: -50% 0;
  color: color-mix(in srgb, var(--beui-foreground) 80%, transparent);
  background-image: linear-gradient(to bottom, transparent, currentColor 6%, currentColor 94%, transparent);
}

.be-timeline-ticks {
  position: absolute;
  left: 50%;
  display: flex;
  align-items: center;
  translate: -50% -50%;
}
.be-timeline-tick {
  display: block;
  width: 1px;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--beui-foreground) 25%, transparent);
}
.be-timeline-tick[data-middle] { background: color-mix(in srgb, var(--beui-foreground) 45%, transparent); }

.be-timeline-list {
  position: absolute;
  inset: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.be-timeline-card { position: absolute; left: 50%; top: 50%; }
.be-timeline-card-inner { position: relative; translate: 0 -50%; }

.be-timeline-surface {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--beui-border);
  border-radius: 1.5rem;
  background: var(--beui-card);
}

.be-timeline-head { padding: 0.75rem 0.875rem 0.5rem; }
.be-timeline-date {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--beui-muted-foreground);
  font-variant-numeric: tabular-nums;
}
.be-timeline-title {
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.5rem;
  letter-spacing: -0.025em;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--beui-foreground);
}

.be-timeline-media { padding: 0 0.5rem; }
.be-timeline-media-frame {
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border: 1px solid var(--beui-border);
  border-radius: 1rem;
  background: var(--beui-background);
}

.be-timeline-meta {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: var(--beui-muted-foreground);
  font-variant-numeric: tabular-nums;
}
.be-timeline-meta-empty { height: 0.5rem; }

.be-timeline-veil {
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: var(--beui-background);
  opacity: var(--veil-opacity, 0);
}

.be-timeline-hit {
  position: absolute;
  inset: 0;
  padding: 0;
  border: 0;
  border-radius: 1.5rem;
  background: transparent;
  cursor: pointer;
  outline: none;
}
.be-timeline-hit:focus-visible { box-shadow: 0 0 0 2px var(--beui-foreground); }
</style>

<script setup lang="ts">
import { AnimatePresence, animate, motion, useMotionValue, type MotionValue } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, triggerRef, useId, useTemplateRef, watch, watchEffect } from 'vue'
import { easeOut, pressSpring, glideSpring } from '../core/motion'
import { useValue } from '../agents/shared'
import { formatMessage, morphingTabsMessages } from './messages'
import MorphingTabsItem from './MorphingTabsItem.vue'

type TabItem = { id: string; label: string; icon?: string; content?: string; disabled?: boolean }
type TabClassNames = { root?: string; rail?: string; tab?: string; activeTab?: string; icon?: string; label?: string; close?: string; content?: string }

const props = withDefaults(defineProps<{
  items: readonly TabItem[]
  modelValue?: string | null
  value?: string | null
  defaultValue?: string | null
  ariaLabel?: string
  className?: string
  classNames?: TabClassNames
  labels?: Partial<typeof morphingTabsMessages>
  /** Enables the close affordance on every tab when provided. */
  onClose?: (id: string) => void
}>(), { defaultValue: null })

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  valueChange: [value: string | null]
  orderChange: [ids: string[]]
}>()

defineSlots<{
  content?(props: { item: TabItem; index: number }): unknown
  icon?(props: { item: TabItem; index: number }): unknown
}>()

const DRAG_THRESHOLD = 5
// The design width of a tab, and the narrowest it may shrink to before the
// label stops reading. See `layout` below.
const MAX_TAB_WIDTH = 176
const MIN_TAB_WIDTH = 96
const TAB_HEIGHT = 56
const TAB_TOP = 24
const TAB_RADIUS = 24
const RAIL_HEIGHT = 80
const SURFACE_INSET = 16
const LIQUID_JOIN = 24
const PANEL_RADIUS = 28

const reduce = useReducedMotion()
const uid = useId()
const root = useTemplateRef<HTMLElement>('root')
const rail = useTemplateRef<HTMLElement>('rail')
const pathElement = useTemplateRef<SVGPathElement>('pathElement')

const order = shallowRef<string[]>(props.items.map(item => item.id))
const orderRef = shallowRef(order.value)
const itemMap = computed(() => new Map(props.items.map(item => [item.id, item])))

const firstItemId = props.items.find(item => !item.disabled)?.id ?? props.items[0]?.id ?? null
// `defaultValue` wins; otherwise the first usable tab opens, as in the original.
const { value: current, set } = useValue<string | null>(
  () => (props.modelValue !== undefined ? props.modelValue : props.value),
  props.defaultValue ?? firstItemId,
  next => { emit('update:modelValue', next); emit('valueChange', next) },
)

const orderedItems = computed(() => order.value.flatMap(id => {
  const item = itemMap.value.get(id)
  return item ? [item] : []
}))
const firstEnabledItem = computed(() => orderedItems.value.find(item => !item.disabled) ?? orderedItems.value[0] ?? null)
const currentItem = computed(() => (current.value ? itemMap.value.get(current.value) : undefined))
const activeItem = computed(() => (currentItem.value && !currentItem.value.disabled ? currentItem.value : firstEnabledItem.value))
const activeId = computed(() => activeItem.value?.id ?? null)

// Keep the incoming item list's order stable: retained ids stay where they are,
// new ones append.
watch(() => props.items.map(item => item.id), ids => {
  const available = new Set(ids)
  const retained = order.value.filter(id => available.has(id))
  const retainedSet = new Set(retained)
  const next = [...retained, ...ids.filter(id => !retainedSet.has(id))]
  if (next.length !== order.value.length || next.some((id, index) => id !== order.value[index])) commitOrder(next, false)
})

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

function moveItem(list: string[], from: number, to: number) {
  if (from === to) return list.slice()
  const next = list.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved!)
  return next
}

function commitOrder(next: string[], notify: boolean) {
  orderRef.value = next
  order.value = next
  if (notify) emit('orderChange', next)
}
watch(order, next => { orderRef.value = next })

// A disabled or vanished selection hands the rail back to the first usable tab.
watch([currentItem, firstEnabledItem], () => {
  if (currentItem.value && !currentItem.value.disabled) return
  if (firstEnabledItem.value && firstEnabledItem.value.id !== current.value) set(firstEnabledItem.value.id)
}, { immediate: true })

const surfaceWidth = shallowRef(0)
const tabGap = shallowRef(12)
const draggingId = shallowRef<string | null>(null)
const dragTargetIndex = shallowRef(-1)
const dragLeft = useMotionValue(SURFACE_INSET)
const surfaceLeft = useMotionValue(SURFACE_INSET)
const positions = new Map<string, MotionValue<number>>()
// Bumped whenever a tab (dis)appears, so the surface effect re-subscribes to
// whichever spring now drives the active slot.
const positionsVersion = shallowRef(0)
const tabButtons: Record<string, HTMLButtonElement | null> = {}

// The rail cannot scroll: the liquid surface is one continuous shape spanning
// the panel, so its notch has to stay over the tab that cut it. Slots narrow
// to fit the panel instead, in that order of sacrifice:
//   1. the design width, down to a floor where a truncated label still reads;
//   2. the gap between slots, so the floor survives one panel narrower;
//   3. the floor itself — a cramped tab is still tappable, a clipped one is not
//      reachable at all.
// Every tier fits inside the panel by construction, so no tab is ever cut off
// and the notch never has to be clamped away from the tab that cut it.
const layout = computed(() => {
  const count = order.value.length
  if (!surfaceWidth.value || count === 0) return { tabWidth: MAX_TAB_WIDTH, slotGap: tabGap.value }
  const inner = surfaceWidth.value - SURFACE_INSET * 2
  const widthAt = (gap: number) => Math.floor((inner - gap * (count - 1)) / count)
  if (widthAt(tabGap.value) >= MIN_TAB_WIDTH) return { tabWidth: Math.min(MAX_TAB_WIDTH, widthAt(tabGap.value)), slotGap: tabGap.value }
  if (count > 1 && widthAt(0) >= MIN_TAB_WIDTH) {
    const gap = Math.floor((inner - MIN_TAB_WIDTH * count) / (count - 1))
    return { tabWidth: MIN_TAB_WIDTH, slotGap: Math.max(0, gap) }
  }
  return { tabWidth: Math.max(0, widthAt(0)), slotGap: 0 }
})
const tabWidth = computed(() => layout.value.tabWidth)
const slotGap = computed(() => layout.value.slotGap)
const slotLefts = computed(() => order.value.map((_, index) => SURFACE_INSET + index * (tabWidth.value + slotGap.value)))

const dragStartIndex = computed(() => (draggingId.value ? order.value.indexOf(draggingId.value) : -1))

function visualIndexFor(index: number) {
  const start = dragStartIndex.value
  const target = dragTargetIndex.value
  if (start < 0 || target < 0) return index
  if (index === start) return target
  if (target > start && index > start && index <= target) return index - 1
  if (target < start && index >= target && index < start) return index + 1
  return index
}

const activeVisualIndex = computed(() => {
  const index = activeId.value ? order.value.indexOf(activeId.value) : -1
  return index < 0 ? -1 : visualIndexFor(index)
})

// Upstream hands its spring config to `animate()` without `type: 'spring'`, which
// motion resolves as its default tween, so the notch and a released tab glide on
// that tween (about 300ms, ease-out) rather than on the spring the tab slots use.
const GLIDE_LIKE_UPSTREAM = { stiffness: 700, damping: 50, mass: 0.5 }
let surfaceAnimation: ReturnType<typeof animate> | undefined
let dragAnimation: ReturnType<typeof animate> | undefined

// The surface settles under the active tab, unless a drag owns it.
watch([activeId, activeVisualIndex, draggingId, slotLefts], () => {
  const id = activeId.value
  const index = activeVisualIndex.value
  const target = slotLefts.value[index]
  if (!id || index < 0 || id === draggingId.value || target === undefined) return
  surfaceAnimation?.stop()
  if (draggingId.value) return
  surfaceAnimation = animate(surfaceLeft, target, reduce.value ? { duration: 0 } : GLIDE_LIKE_UPSTREAM)
}, { flush: 'post' })

function registerPosition(id: string, position: MotionValue<number> | null) {
  if (position) positions.set(id, position)
  else positions.delete(id)
  // `triggerRef` re-runs the surface effect without writing a new value, so a
  // registration during a commit cannot queue another render of its own.
  triggerRef(positionsVersion)
}

function setTabButton(id: string, element: Element | null) {
  tabButtons[id] = element as HTMLButtonElement | null
}

/* ---- the liquid surface -------------------------------------------------- */

function liquidTabPath(tabLeft: number, width: number, slot: number) {
  const panelLeft = SURFACE_INSET
  const panelRight = width - SURFACE_INSET
  const left = Math.max(panelLeft, Math.min(panelRight - slot, tabLeft))
  const right = left + slot
  const top = RAIL_HEIGHT - TAB_HEIGHT
  const bottom = RAIL_HEIGHT
  const leftJoin = Math.max(panelLeft, left - LIQUID_JOIN)
  const rightJoin = Math.min(panelRight, right + LIQUID_JOIN)
  const leftDepth = Math.min(LIQUID_JOIN, left - leftJoin)
  const rightDepth = Math.min(LIQUID_JOIN, rightJoin - right)
  const leftControl = leftDepth * 0.55
  const rightControl = rightDepth * 0.55
  const leftPanelRadius = Math.min(PANEL_RADIUS, leftJoin - panelLeft)
  const rightPanelRadius = Math.min(PANEL_RADIUS, panelRight - rightJoin)
  return [
    `M${panelLeft} ${bottom + PANEL_RADIUS}`,
    `V${bottom + leftPanelRadius}`,
    `Q${panelLeft} ${bottom} ${panelLeft + leftPanelRadius} ${bottom}`,
    `H${leftJoin}`,
    `C${leftJoin + leftControl} ${bottom} ${left} ${bottom - leftDepth + leftControl} ${left} ${bottom - leftDepth}`,
    `V${top + TAB_RADIUS}`,
    `Q${left} ${top} ${left + TAB_RADIUS} ${top}`,
    `H${right - TAB_RADIUS}`,
    `Q${right} ${top} ${right} ${top + TAB_RADIUS}`,
    `V${bottom - rightDepth}`,
    `C${right} ${bottom - rightDepth + rightControl} ${rightJoin - rightControl} ${bottom} ${rightJoin} ${bottom}`,
    `H${panelRight - rightPanelRadius}`,
    `Q${panelRight} ${bottom} ${panelRight} ${bottom + rightPanelRadius}`,
    `V${bottom + PANEL_RADIUS}`,
    'Z',
  ].join(' ')
}

const anyDragging = computed(() => draggingId.value !== null)
const showSurface = computed(() => Boolean(activeId.value) && surfaceWidth.value > SURFACE_INSET * 2)

// While nothing is dragged the notch rides the settled surface value; dragging the
// active tab hands it to the finger, and dragging any other tab leaves it on the
// active tab's own spring while that tab is pushed out of the way.
watchEffect(cleanup => {
  positionsVersion.value
  const element = pathElement.value
  if (!element || !showSurface.value) return
  const driver = anyDragging.value
    ? (draggingId.value === activeId.value ? dragLeft : positions.get(activeId.value ?? ''))
    : surfaceLeft
  if (!driver) return
  const update = (left: number) => element.setAttribute('d', liquidTabPath(left, surfaceWidth.value, tabWidth.value))
  update(driver.get())
  cleanup(driver.on('change', update))
}, { flush: 'post' })

/* ---- pointer drag -------------------------------------------------------- */

type DragSession = {
  id: string
  pointerId: number
  originX: number
  startLeft: number
  startIndex: number
  targetIndex: number
  moved: boolean
  finishing: boolean
  startOrder: string[]
  slotLefts: number[]
}
let drag: DragSession | null = null

function capturePointer(element: Element, pointerId: number) {
  try { element.setPointerCapture(pointerId) } catch { /* Pointer already gone; touch keeps implicit capture. */ }
}

function startDrag(id: string, event: PointerEvent) {
  if (event.button !== 0 || itemMap.value.get(id)?.disabled || drag) return
  const startIndex = orderRef.value.indexOf(id)
  if (startIndex < 0) return
  const capturedSlots = orderRef.value.map((_, index) => SURFACE_INSET + index * (tabWidth.value + slotGap.value))
  const startLeft = capturedSlots[startIndex] ?? SURFACE_INSET
  dragAnimation?.stop()
  dragAnimation = undefined
  dragLeft.set(startLeft)
  drag = {
    id,
    pointerId: event.pointerId,
    originX: event.clientX,
    startLeft,
    startIndex,
    targetIndex: startIndex,
    moved: false,
    finishing: false,
    startOrder: orderRef.value.slice(),
    slotLefts: capturedSlots,
  }
}

function moveDrag(event: PointerEvent) {
  const session = drag
  if (!session || session.finishing || session.pointerId !== event.pointerId) return
  const delta = event.clientX - session.originX
  if (!session.moved && Math.abs(delta) < DRAG_THRESHOLD) return
  event.preventDefault()

  if (!session.moved) {
    session.moved = true
    capturePointer(event.currentTarget as Element, event.pointerId)
    if (session.id === activeId.value) {
      surfaceAnimation?.stop()
      surfaceLeft.set(session.startLeft)
    }
    draggingId.value = session.id
    dragTargetIndex.value = session.startIndex
  }

  const minLeft = session.slotLefts[0] ?? SURFACE_INSET
  const maxLeft = session.slotLefts[session.slotLefts.length - 1] ?? SURFACE_INSET
  const visualLeft = Math.max(minLeft, Math.min(maxLeft, session.startLeft + delta))
  let targetIndex = session.startIndex

  if (visualLeft >= session.startLeft) {
    for (let index = session.startIndex + 1; index < session.slotLefts.length; index += 1) {
      if (visualLeft + tabWidth.value / 2 >= (session.slotLefts[index] ?? 0)) targetIndex = index
    }
  } else {
    for (let index = session.startIndex - 1; index >= 0; index -= 1) {
      if (visualLeft <= (session.slotLefts[index] ?? 0) + tabWidth.value / 2) targetIndex = index
    }
  }

  dragLeft.set(visualLeft)
  if (targetIndex !== session.targetIndex) {
    session.targetIndex = targetIndex
    dragTargetIndex.value = targetIndex
  }
}

async function finishDrag(pointerId: number) {
  const session = drag
  if (!session || session.pointerId !== pointerId || session.finishing) return
  if (!session.moved) { drag = null; return }

  session.finishing = true
  const targetLeft = session.slotLefts[session.targetIndex] ?? SURFACE_INSET
  const controls = animate(dragLeft, targetLeft, reduce.value ? { duration: 0 } : GLIDE_LIKE_UPSTREAM)
  dragAnimation = controls

  await controls.then(() => {})
  if (dragAnimation !== controls) return
  const next = moveItem(session.startOrder, session.startIndex, session.targetIndex)

  if (!reduce.value) {
    // Wait for the other tabs to land before the order commits, so nothing
    // jumps across a slot that is still in flight.
    await new Promise<void>(resolve => {
      const startedAt = performance.now()
      const check = () => {
        const settled = next.every((id, index) => {
          if (id === session.id) return true
          const position = positions.get(id)
          if (!position) return true
          return Math.abs(position.get() - (session.slotLefts[index] ?? 0)) < 0.5 && Math.abs(position.getVelocity()) < 10
        })
        if (settled || performance.now() - startedAt > 500) { resolve(); return }
        requestAnimationFrame(check)
      }
      check()
    })
  }

  if (dragAnimation !== controls) return
  if (session.id === activeId.value) surfaceLeft.set(targetLeft)
  else if (activeId.value) {
    const position = positions.get(activeId.value)
    if (position) surfaceLeft.set(position.get())
  }
  positions.get(session.id)?.jump(targetLeft)
  dragAnimation = undefined
  drag = null
  commitOrder(next, !sameOrder(session.startOrder, next))
  draggingId.value = null
  dragTargetIndex.value = -1
}

function finishFromWindow(event: PointerEvent) { void finishDrag(event.pointerId) }

// A touch is implicitly captured by whatever it landed on — here the label
// inside the tab — so the moment the drag takes the capture for the tab itself,
// that child *loses* it and the notification bubbles back up. Only the tab
// losing its own capture means the platform took the pointer away.
function lostCapture(event: PointerEvent) {
  if (event.target !== event.currentTarget) return
  void finishDrag(event.pointerId)
}

/* ---- keyboard ------------------------------------------------------------ */

function moveBy(id: string, direction: -1 | 1) {
  const list = orderRef.value
  const index = list.indexOf(id)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= list.length || itemMap.value.get(id)?.disabled) return
  commitOrder(moveItem(list, index, nextIndex), true)
}

async function onTabKeyDown(id: string, event: KeyboardEvent) {
  const index = orderRef.value.indexOf(id)
  if (index < 0) return
  if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    event.preventDefault()
    moveBy(id, event.key === 'ArrowLeft' ? -1 : 1)
    return
  }
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  const direction = event.key === 'ArrowLeft' ? -1 : 1
  const count = orderRef.value.length
  let nextIndex = index
  for (let step = 1; step < count; step += 1) {
    const candidate = (index + direction * step + count * step) % count
    if (!itemMap.value.get(orderRef.value[candidate]!)?.disabled) { nextIndex = candidate; break }
  }
  if (nextIndex === index) return
  const nextId = orderRef.value[nextIndex]!
  set(nextId)
  await nextTick()
  requestAnimationFrame(() => tabButtons[nextId]?.focus())
}

function selectTab(id: string) {
  if (drag?.id === id && drag.moved) return
  set(id)
}

/* ---- labels and measuring ------------------------------------------------ */

const text = computed(() => ({ ...morphingTabsMessages, ...props.labels }))
const closeLabel = (label: string) => formatMessage(text.value.close, { label })

let observer: ResizeObserver | undefined
function measure() {
  const host = root.value
  const list = rail.value
  if (!host || !list) return
  surfaceWidth.value = host.clientWidth
  const gap = Number.parseFloat(getComputedStyle(list).columnGap)
  if (Number.isFinite(gap)) tabGap.value = gap
}

onMounted(() => {
  measure()
  if (root.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(root.value)
  }
  window.addEventListener('pointerup', finishFromWindow, true)
  window.addEventListener('pointercancel', finishFromWindow, true)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  surfaceAnimation?.stop()
  dragAnimation?.stop()
  window.removeEventListener('pointerup', finishFromWindow, true)
  window.removeEventListener('pointercancel', finishFromWindow, true)
})

function targetLeftFor(index: number) {
  return slotLefts.value[visualIndexFor(index)] ?? SURFACE_INSET
}
function zIndexFor(item: TabItem) {
  if (item.id === draggingId.value) return 30
  return item.id === activeId.value ? 20 : 1
}
</script>

<template>
  <div v-if="orderedItems.length" ref="root" class="morph-tabs" :class="[classNames?.root, className]">
    <svg v-if="showSurface" class="morph-tabs-surface" :class="[{ 'is-dragging': anyDragging && draggingId === activeId }, classNames?.activeTab]" aria-hidden="true" focusable="false"
      :viewBox="`0 0 ${surfaceWidth} ${RAIL_HEIGHT + PANEL_RADIUS}`" preserveAspectRatio="none">
      <path ref="pathElement" fill="currentColor" />
    </svg>

    <div class="morph-tabs-strip">
      <div ref="rail" class="morph-tabs-rail" role="tablist" aria-orientation="horizontal" :aria-label="ariaLabel ?? text.label" :class="classNames?.rail">
        <MorphingTabsItem v-for="(item, index) in orderedItems" :key="item.id" :tab-id="item.id" :target-left="targetLeftFor(index)"
          :dragging="item.id === draggingId" :drag-left="dragLeft" :reduce="reduce" :z-index="zIndexFor(item)" :disabled="item.disabled"
          :register-position="registerPosition" :on-down="event => startDrag(item.id, event)" :on-move="moveDrag"
          :on-up="event => void finishDrag(event.pointerId)" :on-cancel="event => void finishDrag(event.pointerId)" :on-lost-capture="lostCapture">
          <div class="morph-tab-slot" :style="{ width: `${tabWidth}px`, height: `${TAB_HEIGHT}px`, marginTop: `${TAB_TOP}px` }">
            <span v-if="item.id !== activeId" aria-hidden="true" class="morph-tab-hover" :data-dragging="item.id === draggingId || undefined" />
            <button :id="`${uid}-tab-${item.id}`" :ref="element => setTabButton(item.id, element as Element | null)" type="button" role="tab"
              :aria-selected="item.id === activeId" :aria-controls="`${uid}-panel`" :aria-disabled="item.disabled || undefined"
              :tabindex="item.id === activeId ? 0 : -1" :disabled="item.disabled" :class="['morph-tab-button', item.id === activeId ? 'is-active' : 'is-idle', classNames?.tab]"
              @click="selectTab(item.id)" @keydown="onTabKeyDown(item.id, $event)">
              <span aria-hidden="true" class="morph-tab-focus" :data-active="item.id === activeId || undefined" />
              <span v-if="item.icon || $slots.icon" aria-hidden="true" class="morph-tab-icon" :class="classNames?.icon">
                <slot name="icon" :item="item" :index="index">{{ item.icon }}</slot>
              </span>
              <span class="morph-tab-label" :class="classNames?.label">{{ item.label }}</span>
            </button>
            <button v-if="onClose" type="button" class="morph-tab-close" :class="[classNames?.close, { 'is-idle': item.id !== activeId }]"
              :aria-label="closeLabel(item.label)" @pointerdown="event => event.stopPropagation()"
              @click="event => { event.stopPropagation(); onClose?.(item.id) }">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
            </button>
          </div>
        </MorphingTabsItem>
      </div>
    </div>

    <div :id="`${uid}-panel`" role="tabpanel" :aria-labelledby="`${uid}-tab-${activeId ?? 'empty'}`" class="morph-tabs-panel" :class="classNames?.content">
      <AnimatePresence mode="popLayout" :initial="false">
        <motion.div v-if="activeItem" :key="activeItem.id" class="morph-tabs-content"
          :initial="reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(6px)' }"
          :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
          :exit="reduce ? { opacity: 0, transition: { duration: 0.08, ease: easeOut } } : { opacity: 0, y: -5, filter: 'blur(5px)', transition: { duration: 0.12, ease: easeOut } }"
          :transition="reduce ? { duration: 0.12, ease: easeOut } : pressSpring">
          <slot name="content" :item="activeItem" :index="orderedItems.findIndex(entry => entry.id === activeItem.id)">{{ activeItem.content }}</slot>
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
</template>

<style scoped>
/* The rail is a deliberately dark surface and the panel a light one in both
   themes, which is what the liquid notch is drawn against, so the pair is
   fixed rather than derived from the theme. */
.morph-tabs {
  --mt-rail: #292929;
  --mt-rail-ink: #fff;
  --mt-panel: #fafaf8;
  --mt-panel-ink: #181818;
  position: relative;
  isolation: isolate;
  min-width: 0;
  overflow: hidden;
  border-radius: 2rem;
  background: var(--mt-rail);
  color: var(--mt-rail-ink);
}
.morph-tabs-surface { pointer-events: none; position: absolute; inset-inline: 0; top: 0; z-index: 0; width: 100%; height: 108px; color: var(--mt-panel); }
.morph-tabs-surface.is-dragging { z-index: 20; }
.morph-tabs-strip { position: relative; height: 5rem; }
.morph-tabs-rail { position: relative; z-index: 30; display: flex; height: 100%; gap: .75rem; }
@media (min-width: 768px) { .morph-tabs-rail { gap: 1rem; } }
.morph-tab-slot { position: relative; display: flex; align-items: stretch; }
.morph-tab-hover { position: absolute; inset-inline: 0; top: 0; bottom: .5rem; border-radius: 1.25rem; background: transparent; transition: background-color .2s cubic-bezier(.4, 0, .2, 1); }
.morph-tab:hover .morph-tab-hover { background: rgb(255 255 255 / .06); }
.morph-tab-hover[data-dragging], .morph-tab:hover .morph-tab-hover[data-dragging] { background: #3a3a3a; }
.morph-tab-button { position: relative; z-index: 10; display: flex; align-items: center; gap: .5rem; width: 100%; min-width: 0; height: 100%; overflow: hidden; padding-inline: .75rem; border: 0; border-start-start-radius: 1.5rem; border-start-end-radius: 1.5rem; background: transparent; font: inherit; text-align: left; cursor: pointer; outline: none; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1); }
.morph-tab-button.is-active { color: var(--mt-panel-ink); }
.morph-tab-button.is-idle { padding-bottom: .5rem; color: rgb(255 255 255 / .7); }
.morph-tab-button:not(:disabled).is-idle:hover { color: var(--mt-rail-ink); }
.morph-tab-button:disabled { cursor: not-allowed; }
.morph-tab-icon { display: grid; place-items: center; width: 2rem; height: 2rem; flex: none; }
.morph-tab-label { min-width: 0; font-size: 1rem; font-weight: 500; line-height: 1; letter-spacing: -.025em; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.morph-tab-focus { pointer-events: none; position: absolute; inset-inline: .25rem; top: .25rem; bottom: .5rem; border: 2px solid rgb(255 255 255 / .6); border-radius: 1rem; opacity: 0; transition: opacity .15s cubic-bezier(.4, 0, .2, 1); }
.morph-tab-focus[data-active] { bottom: 0; border-color: rgb(0 0 0 / .2); border-bottom: 0; border-start-start-radius: 1.25rem; border-start-end-radius: 1.25rem; }
.morph-tab-button:focus-visible .morph-tab-focus { opacity: 1; }
.morph-tab-close { position: absolute; right: .5rem; top: 50%; z-index: 20; display: grid; place-items: center; width: 1.5rem; height: 1.5rem; translate: 0 -50%; padding: 0; border: 0; border-radius: 50%; background: transparent; color: #9aa0a8; cursor: pointer; transition: background-color .15s cubic-bezier(.4, 0, .2, 1), color .15s cubic-bezier(.4, 0, .2, 1); }
.morph-tab-close svg { width: .875rem; height: .875rem; }
.morph-tab-close:hover { background: rgb(0 0 0 / .06); color: #4b5563; }
.morph-tab-close.is-idle { top: calc(50% - 4px); color: rgb(255 255 255 / .45); }
.morph-tab-close.is-idle:hover { background: rgb(255 255 255 / .08); color: rgb(255 255 255 / .8); }
.morph-tab-close:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.morph-tabs-panel { position: relative; z-index: 20; margin-inline: 1rem; min-height: 16rem; overflow: hidden; border-radius: 1.75rem; background: var(--mt-panel); color: var(--mt-panel-ink); }
.morph-tabs-content { min-height: 16rem; }
</style>

<script setup lang="ts">
import { cancelFrame, frame, motion } from 'motion-v'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch, type VNode } from 'vue'
import { ICON_GAP, useTabs } from './context'

// The row of triggers: scrolls when it overflows, moves one indicator under the
// selected tab, and clips each trigger's inverted label to that indicator.
defineOptions({ inheritAttrs: false })
defineProps<{
  /** Class of the outer frame; `class` itself lands on the tab list. */
  wrapperClassName?: string
}>()
defineSlots<{ default?: () => VNode[] }>()

const ctx = useTabs('TabsList')
const root = useTemplateRef<HTMLElement>('root')
const viewportRef = useTemplateRef<unknown>('viewport')
// A motion component: its element is the instance's `$el`.
const viewport = computed(() => (viewportRef.value as { $el?: HTMLElement } | null)?.$el ?? null)
const list = useTemplateRef<HTMLElement>('list')
const viewportId = `be-tabs-viewport-${useId()}`
const edges = shallowRef({ overflow: false, left: false, right: false })
// A computed, so a watcher over it fires when overflow flips, not on every scroll-edge change (a shallowRef
// source forces the callback on any trigger, which would snap the list back to the selected tab while scrolling).
const overflowing = computed(() => edges.value.overflow)
const tracked = computed(() => ctx.icons.value === 'selected' && ctx.variant.value !== 'underline')
const mask = computed(() => `linear-gradient(to right, ${edges.value.left ? 'transparent, black 40px' : 'black, black 0px'}, ${edges.value.right ? 'black calc(100% - 40px), transparent' : 'black 100%'})`)

function scrollOffset(host: HTMLElement) {
  const max = Math.max(0, host.scrollWidth - host.clientWidth)
  const rtl = getComputedStyle(host).direction === 'rtl'
  // Modern browsers expose negative scrollLeft in RTL. Clamp rubber-banding.
  return { max, fromLeft: Math.max(0, Math.min(max, rtl ? max + host.scrollLeft : host.scrollLeft)) }
}

function measure() {
  const host = viewport.value
  const frameElement = root.value
  if (!host || !frameElement) return
  // Overlay controls do not reduce the viewport or change its scroll range.
  const overflow = host.scrollWidth > frameElement.clientWidth + 1
  const { max, fromLeft } = scrollOffset(host)
  const next = { overflow, left: fromLeft > 1, right: fromLeft < max - 1 }
  const previous = edges.value
  if (previous.overflow !== next.overflow || previous.left !== next.left || previous.right !== next.right) edges.value = next
}

function selectedTab() {
  return list.value?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]') ?? null
}

function reveal(tab: HTMLElement | null) {
  const host = viewport.value
  if (!host || !tab) return
  const bounds = host.getBoundingClientRect()
  const item = tab.getBoundingClientRect()
  const { max, fromLeft } = scrollOffset(host)
  // Keep the selected/focused label clear of the arrows over the faded edges.
  const left = bounds.left + (fromLeft > 1 ? 36 : 0)
  const right = bounds.right - (fromLeft < max - 1 ? 36 : 0)
  const delta = item.left < left ? item.left - left : item.right > right ? item.right - right : 0
  // Scroll only this viewport; scrollIntoView can also move the whole page.
  if (delta) host.scrollBy({ left: delta, behavior: ctx.reduce.value ? 'instant' : 'smooth' })
}

function scroll(direction: number) {
  const host = viewport.value
  if (host) host.scrollBy({ left: direction * host.clientWidth * 0.8, behavior: ctx.reduce.value ? 'instant' : 'smooth' })
}

// The pill springs straight to where the selected tab will settle. With
// icons="selected" the chosen tab grows as its icon opens and the last one
// shrinks, so measuring mid-change would make the pill squeeze and catch up:
// open the selected icon and fold the rest for one synchronous read instead,
// then hand the styles back to Motion before anything paints.
function place() {
  const host = list.value
  if (!host) return
  // The underline indicator is laid out by its own layout animation.
  if (ctx.variant.value === 'underline') {
    ctx.placed.value = true
    return
  }
  const target = Array.from(host.querySelectorAll<HTMLElement>('[role="tab"]')).find(tab => tab.dataset.tabsValue === ctx.value.value)
  if (!target) return
  const icons = tracked.value ? Array.from(host.querySelectorAll<HTMLElement>('[role="tab"] > [data-tabs-icon]')) : []
  const saved = icons.map(icon => [icon.style.width, icon.style.marginRight] as const)
  for (const icon of icons) {
    const open = icon.parentElement === target
    icon.style.width = open ? 'auto' : '0px'
    icon.style.marginRight = open ? `${ICON_GAP}px` : '0px'
  }
  // Fractional boxes: a rounded edge leaves the pill a hair off its tab. Tracked
  // pills keep the integer offsets the original measures with.
  const tab = target.getBoundingClientRect()
  const origin = host.getBoundingClientRect()
  const left = tracked.value ? target.offsetLeft : tab.left - origin.left - host.clientLeft
  const top = tracked.value ? target.offsetTop : tab.top - origin.top - host.clientTop
  const box = {
    x: left,
    y: top,
    width: tab.width,
    height: tab.height,
  }
  icons.forEach((icon, index) => {
    [icon.style.width, icon.style.marginRight] = saved[index]!
  })
  // A first measurement, or one after the list was hidden, lands in place.
  const instant = ctx.reduce.value || ctx.track.width.get() === 0
  if (instant) {
    for (const key of ['x', 'y', 'width', 'height'] as const) ctx.track[key].jump(box[key])
  } else {
    for (const key of ['x', 'y', 'width', 'height'] as const) ctx.track[key].set(box[key])
  }
  // Hand over from the CSS pill once there's a real box, before paint.
  if (box.width > 0) ctx.placed.value = true
}

function update() {
  measure()
  reveal(selectedTab())
}

let observer: ResizeObserver | undefined
let observed = new Set<Element>()
function observeTabs() {
  if (!observer || !list.value) return
  const next = new Set(list.value.querySelectorAll('[role="tab"]'))
  for (const element of observed) if (!next.has(element)) observer.unobserve(element)
  for (const element of next) if (!observed.has(element)) observer.observe(element)
  observed = next
}

onMounted(() => {
  const frameElement = root.value
  const host = viewport.value
  const track = list.value
  if (!frameElement || !host || !track) return
  observer = new ResizeObserver(() => {
    update()
    place()
  })
  observer.observe(frameElement)
  observer.observe(host)
  observer.observe(track)
  observeTabs()
  update()
  place()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelFrame(syncClips)
})

// Children may change without a resize; controlled selection must also reveal.
watch([ctx.value, ctx.tabs, ctx.variant, ctx.icons, ctx.reduce, overflowing], () => {
  observeTabs()
  update()
  // The indicator remounts inside the newly selected tab's wrapper; place after
  // it has mounted, or a jump straight to the new box would go unseen by it.
  void nextTick(place)
}, { flush: 'post' })

// --- Inverted labels ------------------------------------------------------
// Each trigger carries a second, inverted copy of its label. A shared pass
// after Motion paints the indicator clips every copy to the part of the
// indicator that covers it, including labels crossed during a long or
// interrupted glide.
let frames = 0
let stillFrames = 0
let previous: { left: number, right: number } | undefined
function syncClips() {
  const host = list.value
  if (!host) return
  const labels = Array.from(host.querySelectorAll<HTMLElement>('[data-tabs-label]'))
  const indicator = host.querySelector<HTMLElement>('[data-tabs-indicator]')
  const tab = selectedTab()
  if (!indicator || !tab || tab.dataset.tabsValue !== ctx.value.value) {
    for (const label of labels) label.style.clipPath = 'inset(0 100% 0 0)'
    cancelFrame(syncClips)
    return
  }
  const pill = (ctx.reduce.value ? tab : indicator).getBoundingClientRect()
  // Read ALL geometry before writing ANY masks.
  const clips = labels.map(label => {
    const bounds = label.getBoundingClientRect()
    const left = Math.max(0, Math.min(bounds.width, pill.left - bounds.left))
    const right = Math.max(0, Math.min(bounds.width, bounds.right - pill.right))
    return left + right >= bounds.width ? 'inset(0 100% 0 0)' : `inset(0 ${right}px 0 ${left}px)`
  })
  labels.forEach((label, index) => {
    if (label.style.clipPath !== clips[index]) label.style.clipPath = clips[index]!
  })
  frames += 1
  stillFrames = previous && Math.abs(pill.left - previous.left) < 0.01 && Math.abs(pill.right - previous.right) < 0.01 ? stillFrames + 1 : 0
  previous = { left: pill.left, right: pill.right }
  if (ctx.reduce.value || (frames > 2 && stillFrames >= 2)) cancelFrame(syncClips)
}
function resync() {
  frames = 0
  stillFrames = 0
  previous = undefined
  cancelFrame(syncClips)
  frame.postRender(syncClips, true)
}
let clipObserver: ResizeObserver | undefined
onMounted(() => {
  if (!list.value) return
  // A list measured while hidden (display: none, a closed panel, a breakpoint)
  // gets every mask closed. Sync again once it has a size, or the selected
  // label stays invisible until the value changes.
  clipObserver = new ResizeObserver(resync)
  clipObserver.observe(list.value)
  resync()
})
onBeforeUnmount(() => clipObserver?.disconnect())
watch([ctx.value, ctx.tabs, ctx.variant, ctx.reduce, ctx.placed, ctx.icons], resync, { flush: 'post' })

// Arrow keys move along the list and select as focus arrives, wrapping at the
// ends; Home and End jump to the first and last enabled tab.
function onListKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented) return
  const host = list.value
  if (!host || !(event.target instanceof HTMLElement)) return
  const tabs = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')).filter(tab => !tab.disabled && tab.closest('[role="tablist"]') === host)
  const at = tabs.indexOf(event.target as HTMLButtonElement)
  if (at < 0) return
  const rtl = getComputedStyle(host).direction === 'rtl'
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
  const back = rtl ? 'ArrowRight' : 'ArrowLeft'
  const next = event.key === forward ? tabs[(at + 1) % tabs.length]
    : event.key === back ? tabs[(at - 1 + tabs.length) % tabs.length]
      : event.key === 'Home' ? tabs[0]
        : event.key === 'End' ? tabs[tabs.length - 1]
          : null
  if (!next) return
  event.preventDefault()
  next.focus()
  next.click()
}

function onFocusCapture(event: FocusEvent) {
  if (event.target instanceof HTMLElement && event.target.getAttribute('role') === 'tab') reveal(event.target)
}
</script>

<template>
  <div ref="root" class="be-scroll-frame" :class="[`is-${ctx.variant.value}`, wrapperClassName]" :data-overflow="edges.overflow">
    <button v-if="edges.overflow" type="button" class="be-scroll left" :aria-label="ctx.t.value.scrollLeft" :aria-controls="viewportId" :disabled="!edges.left" @click="scroll(-1)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </button>
    <motion.div :id="viewportId" ref="viewport" layout-scroll class="be-viewport" :style="edges.overflow ? { maskImage: mask } : undefined" @scroll.passive="measure" @focusin.capture="onFocusCapture">
      <div :aria-label="ctx.t.value.list" v-bind="$attrs" ref="list" role="tablist" class="be-list" :class="`is-${ctx.variant.value}`" :data-placed="ctx.placed.value" @keydown="onListKeyDown">
        <slot />
      </div>
    </motion.div>
    <span v-if="edges.overflow && edges.left" aria-hidden="true" class="be-fade left" />
    <span v-if="edges.overflow && edges.right" aria-hidden="true" class="be-fade right" />
    <button v-if="edges.overflow" type="button" class="be-scroll right" :aria-label="ctx.t.value.scrollRight" :aria-controls="viewportId" :disabled="!edges.right" @click="scroll(1)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </button>
  </div>
</template>

<style scoped>
.be-scroll-frame { position: relative; isolation: isolate; display: flex; align-items: center; width: 100%; max-width: 100%; min-width: 0; }
.be-scroll-frame.is-pill[data-overflow=true] { border-radius: 9999px; background: var(--beui-card); }
.be-scroll-frame.is-segment[data-overflow=true] { border-radius: .5rem; background: var(--beui-card); }
.be-viewport { width: 100%; min-width: 0; overflow-x: auto; scrollbar-width: none; }
.be-viewport::-webkit-scrollbar { display: none; }
.be-scroll-frame[data-overflow=true] .be-viewport { border-radius: inherit; }
.be-list { position: relative; display: inline-flex; align-items: center; gap: .25rem; width: max-content; padding: .25rem; border-radius: 9999px; background: var(--beui-card); }
.be-list.is-segment { gap: 0; padding: .125rem; border-radius: .5rem; }
.be-list.is-underline { padding: 0; border-radius: 0; border: 0 solid var(--beui-border); border-bottom-width: 1px; background: transparent; }
.be-list[data-placed=false] :deep(.be-trigger[aria-selected=true]) { background: var(--beui-primary); }
.be-scroll { position: absolute; inset-block: 0; z-index: 20; display: inline-flex; width: 2.25rem; align-items: center; justify-content: center; padding: 0; border: 0; background: transparent; color: var(--beui-foreground); font: inherit; cursor: pointer; transition: opacity .15s cubic-bezier(.4, 0, .2, 1); }
.be-scroll:hover { opacity: .7; }
.be-scroll:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: -4px; }
.be-scroll:disabled { pointer-events: none; opacity: 0; cursor: default; }
.be-scroll.left { left: 0; border-radius: 9999px 0 0 9999px; }
.be-scroll.right { right: 0; border-radius: 0 9999px 9999px 0; }
.be-fade { pointer-events: none; position: absolute; inset-block: 0; z-index: 10; width: 2.5rem; backdrop-filter: blur(2px); }
.be-fade.left { left: 0; border-radius: inherit; border-top-right-radius: 0; border-bottom-right-radius: 0; mask-image: linear-gradient(to right, black, transparent); }
.be-fade.right { right: 0; border-radius: inherit; border-top-left-radius: 0; border-bottom-left-radius: 0; mask-image: linear-gradient(to left, black, transparent); }
</style>

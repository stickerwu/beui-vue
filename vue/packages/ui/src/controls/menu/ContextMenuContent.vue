<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { easeOut } from '../../core/motion'
import { useContextRoot } from './context-shared'
import { TYPEAHEAD_RESET, VIEWPORT_PADDING, clamp } from './menu-shared'
import './menu.css'

// Always mounted, clipped to a small rounded rect at the click point and
// opened to full size on one ease. Port of `ContextMenuContent`.
defineOptions({ inheritAttrs: false })
const props = defineProps<{
  /** Accessible name of the menu. Overrides the root's `label`. */
  ariaLabel?: string
}>()
const MORPH_DURATION = 0.3
const root = useContextRoot('ContextMenuContent')
const mounted = shallowRef(false)
const position = shallowRef({ x: 0, y: 0 })
const origin = shallowRef({ x: 0, y: 0 })
const size = shallowRef({ width: 0, height: 0 })
const morphReady = shallowRef(false)
let typeahead = ''
let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => { mounted.value = true })

function setContent(node: unknown) {
  const el = (node as { $el?: HTMLElement } | null)?.$el ?? (node as HTMLElement | null)
  root.contentEl.value = el instanceof HTMLElement ? el : null
}
function enabledItems() {
  return Array.from(root.contentEl.value?.querySelectorAll<HTMLElement>('[data-context-menu-item="true"]:not([data-disabled="true"])') ?? [])
}

function collapsedClip(from: { x: number; y: number }, extent: { width: number; height: number }) {
  const half = 8
  const top = clamp(from.y - half, 0, extent.height)
  const right = clamp(extent.width - from.x - half, 0, extent.width)
  const bottom = clamp(extent.height - from.y - half, 0, extent.height)
  const left = clamp(from.x - half, 0, extent.width)
  return `inset(${top}px ${right}px ${bottom}px ${left}px round 10px)`
}

watch([root.open, root.point, root.invocation, root.modality, root.reduce, mounted], (_now, _prev, cleanup) => {
  if (!root.open.value) { morphReady.value = false; return }
  const content = root.contentEl.value
  if (!content) return
  content.dataset.invocation = String(root.invocation.value)
  const rect = content.getBoundingClientRect()
  const point = root.point.value
  const left = Math.max(VIEWPORT_PADDING, Math.min(Math.max(point.x, VIEWPORT_PADDING), window.innerWidth - rect.width - VIEWPORT_PADDING))
  const top = Math.max(VIEWPORT_PADDING, Math.min(Math.max(point.y, VIEWPORT_PADDING), window.innerHeight - rect.height - VIEWPORT_PADDING))
  position.value = { x: left, y: top }
  size.value = { width: rect.width, height: rect.height }
  origin.value = {
    x: clamp(point.x - left, 12, Math.max(12, rect.width - 12)),
    y: clamp(point.y - top, 12, Math.max(12, rect.height - 12)),
  }
  morphReady.value = false
  if (root.reduce.value || root.modality.value === 'keyboard') { morphReady.value = true; return }
  // Let the measured collapsed clip paint once before expanding it. Without
  // this preparation frame, the first invocation can batch both states and
  // appear at full size without the morph.
  let openFrame = 0
  const prepareFrame = requestAnimationFrame(() => { openFrame = requestAnimationFrame(() => { morphReady.value = true }) })
  cleanup(() => { cancelAnimationFrame(prepareFrame); cancelAnimationFrame(openFrame) })
}, { flush: 'post', immediate: true })

watch(root.open, (now, _prev, cleanup) => {
  if (!now) return
  const frame = requestAnimationFrame(() => { enabledItems()[0]?.focus({ preventScroll: true }) })
  cleanup(() => cancelAnimationFrame(frame))
}, { flush: 'post' })

onBeforeUnmount(() => { if (typeaheadTimer) clearTimeout(typeaheadTimer) })

function moveFocus(direction: 1 | -1) {
  const items = enabledItems()
  if (items.length === 0) return
  const current = items.indexOf(document.activeElement as HTMLElement)
  const next = current < 0 ? 0 : (current + direction + items.length) % items.length
  items[next]?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    root.setOpen(false)
    root.triggerEl.value?.focus()
    return
  }
  if (event.key === 'Tab') { root.setOpen(false); return }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); moveFocus(event.key === 'ArrowDown' ? 1 : -1); return }
  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    const items = enabledItems()
    items[event.key === 'Home' ? 0 : items.length - 1]?.focus()
    return
  }
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    typeahead += event.key.toLocaleLowerCase()
    if (typeaheadTimer) clearTimeout(typeaheadTimer)
    typeaheadTimer = setTimeout(() => { typeahead = '' }, TYPEAHEAD_RESET)
    enabledItems().find(item => (item.dataset.label ?? item.textContent ?? '').trim().toLocaleLowerCase().startsWith(typeahead))?.focus()
  }
}

const visualOpen = computed(() => root.open.value && morphReady.value)
const clipShown = 'inset(0px 0px 0px 0px round 12px)'
const animate = computed(() => ({
  opacity: visualOpen.value ? 1 : 0,
  clipPath: root.reduce.value || root.modality.value === 'keyboard' || visualOpen.value ? clipShown : collapsedClip(origin.value, size.value),
}))
const transition = computed(() => root.modality.value === 'keyboard'
  ? { duration: 0 }
  : root.reduce.value
    ? { duration: 0.1, ease: easeOut }
    : { clipPath: { duration: MORPH_DURATION, ease: easeOut }, opacity: { duration: MORPH_DURATION, ease: easeOut } })
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <div data-context-menu-portal="" :aria-hidden="!root.open.value" :inert="!root.open.value" class="be-ctx-portal"
      :style="{ left: `${position.x}px`, top: `${position.y}px`, pointerEvents: root.open.value ? 'auto' : 'none' }">
      <motion.div
        v-bind="$attrs" :ref="setContent" :id="root.menuId" role="menu" :aria-label="props.ariaLabel ?? ($attrs['aria-label'] as string | undefined) ?? root.label.value"
        :data-morph-ready="morphReady ? 'true' : 'false'" tabindex="-1" class="be-ctx-panel" :initial="false" :animate="animate" :transition="transition"
        @keydown="onKeydown" @contextmenu.prevent
      >
        <slot />
      </motion.div>
    </div>
  </Teleport>
</template>

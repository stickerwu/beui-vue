<script setup lang="ts">
import { animate, motion, type MotionValue } from 'motion-v'
import { onBeforeUnmount, onMounted, provide, shallowRef, useId, useTemplateRef } from 'vue'
import { layoutSpring } from '../../core/motion'
import { useAnimatedSidebar, sidebarMenuKey } from './context'

// Port of `SharedLayoutBg` as the menu uses it: one pill glides between rows
// as the pointer or focus moves; each `AnimatedSidebarMenuItem` renders it.
const { reduce } = useAnimatedSidebar()
const activeKey = shallowRef<string | null>(null)
// Focus leaving the list only clears the pill when the pointer is not still
// resting on an item.
const hovering = shallowRef(false)
const list = useTemplateRef<unknown>('list')
const uid = useId()

function listElement() {
  const node = list.value as { $el?: unknown } | HTMLElement | null
  const element = node && '$el' in node ? node.$el : node
  return element instanceof HTMLElement ? element : null
}
// Reflow glide: React keeps each row on `layout="position"`, so every row that a
// submenu pushes down or pulls up springs from its old place to its new one.
// Vue only re-renders the rows whose own props changed, so the shift is read
// from the list instead: each row's top is remembered, and when the list
// resizes, the difference becomes a transform that springs back to zero.
type Entry = { element: () => HTMLElement | null; y: MotionValue<number> }
const entries = new Set<Entry>()
const tops = new Map<Entry, number>()
let resizeObserver: ResizeObserver | undefined
function reflow() {
  for (const entry of entries) {
    const element = entry.element()
    if (!element) continue
    const next = element.offsetTop
    const previous = tops.get(entry)
    tops.set(entry, next)
    if (previous === undefined || Math.abs(previous - next) < 0.5 || reduce.value) continue
    entry.y.set(entry.y.get() + previous - next)
    animate(entry.y, 0, layoutSpring)
  }
}
onMounted(() => {
  const element = listElement()
  if (!element) return
  resizeObserver = new ResizeObserver(reflow)
  resizeObserver.observe(element)
})
onBeforeUnmount(() => resizeObserver?.disconnect())

provide(sidebarMenuKey, {
  register(entry: Entry) {
    entries.add(entry)
    const element = entry.element()
    if (element) tops.set(entry, element.offsetTop)
    return () => { entries.delete(entry); tops.delete(entry) }
  },
  activeKey,
  hovering,
  uid,
  reduce,
  enter(key: string) { hovering.value = true; activeKey.value = key },
  focusKey(key: string) { activeKey.value = key },
})

function mouseleave() {
  hovering.value = false
  // Keep the pill on a focused item so keyboard position stays visible.
  if (!listElement()?.contains(document.activeElement)) activeKey.value = null
}
function focusout(event: FocusEvent) {
  const next = event.relatedTarget
  if (!hovering.value && !(next instanceof Node && listElement()?.contains(next))) activeKey.value = null
}
</script>

<template>
  <!-- layoutRoot scopes the pill's layout projection to this list, so fixed or
       scrolled ancestors can't smear scroll offsets into its movement. -->
  <motion.ul ref="list" layout-root data-slot="sidebar-menu" class="be-asb-menu" @mouseleave="mouseleave" @focusout="focusout">
    <slot />
  </motion.ul>
</template>

<style>
:where(.be-asb-menu) { display: flex; flex-direction: column; gap: .125rem; width: 100%; min-width: 0; margin: 0; padding: 0; list-style: none; }
</style>

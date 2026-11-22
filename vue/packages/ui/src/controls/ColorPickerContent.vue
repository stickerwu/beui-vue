<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, nextTick, onMounted, provide, shallowRef, useSlots, watch, type VNode } from 'vue'
import { flattenSlot } from '../core/flatten-slot'
import { easeOut, layoutSpring } from '../core/motion'
import { useReducedMotion } from '../core/reduced-motion'
import { useDismiss } from './popover/pop-helpers'
import ColorPickerArea from './ColorPickerArea.vue'
import { colorPickerMorphKey, useColorPickerContext } from './color-picker-context'

/**
 * Panel opened by `ColorPickerTrigger`, laid out under it. A `ColorPickerArea` placed
 * directly inside grows out of the trigger chip; the other children stagger in behind it.
 * Closes on outside press and Escape.
 */
const props = withDefaults(defineProps<{
  /** Edge of the trigger the panel lines up with. */
  align?: 'start' | 'end'
}>(), { align: 'start' })
defineOptions({ inheritAttrs: false })
defineSlots<{ default?: () => unknown }>()

const context = useColorPickerContext('ColorPickerContent')
provide(colorPickerMorphKey, true)
const reduce = useReducedMotion()
const slots = useSlots()
const panel = shallowRef<HTMLElement | null>(null)
function bindPanel(node: unknown) { panel.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node) as HTMLElement | null }

// Each layer owns its enter and exit values instead of inheriting them from
// the panel. Reopening during the close cancels the exit per element, and an
// element only returns to its enter state if that state is its own.
const PANEL_DELAY = 0.1
const PANEL_STAGGER = 0.035
const PANEL_ITEM_EXIT = { opacity: 0, transition: { duration: 0.1 } }
const VIEWPORT_GUTTER = 8
const item = computed(() => (reduce.value
  ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
  : { initial: { opacity: 0, y: -6, filter: 'blur(4px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)' } }))
const stagger = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))

interface Entry { key: string | number | symbol; vnode: VNode; area: boolean; row: number }
// Called from the template, so the slot is read (and tracked) while rendering.
function entries(): Entry[] {
  let row = 0
  return flattenSlot(slots.default?.()).map((vnode, index) => {
    const area = vnode.type === ColorPickerArea
    if (!area) row += 1
    return { key: vnode.key ?? index, vnode, area, row }
  })
}

useDismiss(context.open, () => { context.open.value = false }, target => Boolean(panel.value?.contains(target) || context.triggerEl.value?.contains(target)))
// Keep the panel on screen horizontally, before motion measures the area.
function keepOnScreen() {
  const element = panel.value
  if (!element) return
  element.style.marginLeft = '0px'
  const rect = element.getBoundingClientRect()
  const max = document.documentElement.clientWidth - VIEWPORT_GUTTER
  let shift = 0
  if (rect.right > max) shift = max - rect.right
  if (rect.left + shift < VIEWPORT_GUTTER) shift = VIEWPORT_GUTTER - rect.left
  element.style.marginLeft = `${shift}px`
}
// Skipped on mount, so a picker that starts open does not steal page focus.
let mountedOnce = false
onMounted(() => { mountedOnce = true })
watch(context.open, (next, previous) => {
  if (!mountedOnce) return
  if (next) {
    nextTick(() => {
      keepOnScreen()
      panel.value?.querySelector<HTMLElement>('[role="slider"]:not([aria-disabled]), input:not(:disabled), button:not(:disabled)')?.focus({ preventScroll: true })
    })
    return
  }
  // The exit keeps the old vnode, so take the panel out of focus order and
  // pointer reach by hand the moment it starts leaving.
  const element = panel.value
  const active = document.activeElement
  if (element) element.inert = true
  if (previous && (!active || active === document.body || element?.contains(active))) context.triggerEl.value?.focus({ preventScroll: true })
}, { flush: 'sync' })
</script>

<template>
  <AnimatePresence>
    <motion.div
      v-if="context.open.value" :ref="bindPanel" :id="`${context.id}-content`" role="dialog" :aria-label="context.t.value.dialog"
      class="be-picker-panel" :class="{ 'be-picker-panel-end': props.align === 'end' }" v-bind="$attrs">
      <!-- The surface fades on its own layer so the morphing area is never faded with it. -->
      <motion.div
        aria-hidden="true" class="be-picker-surface" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.16, ease: easeOut, delay: PANEL_DELAY }" />
      <template v-for="entry in entries()" :key="entry.key">
        <component :is="entry.vnode" v-if="entry.area" />
        <motion.div
          v-else :initial="item.initial" :animate="item.animate" :exit="PANEL_ITEM_EXIT"
          :transition="{ ...stagger, delay: PANEL_DELAY + entry.row * PANEL_STAGGER }">
          <component :is="entry.vnode" />
        </motion.div>
      </template>
    </motion.div>
  </AnimatePresence>
</template>

<style>
.be-picker-panel { position: absolute; top: 100%; left: 0; z-index: 50; box-sizing: border-box; display: flex; width: 18rem; margin-top: .5rem; flex-direction: column; gap: .75rem; padding: .75rem; }
.be-picker-panel-end { left: auto; right: 0; }
.be-picker-surface { position: absolute; inset: 0; z-index: -1; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); box-shadow: 0 12px 32px -8px rgb(0 0 0 / .25); }
</style>

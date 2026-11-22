<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useComboContext } from './combo-context'
import { usePortalPosition } from './use-portal-position'
import './combo.css'

/**
 * The panel, portalled to the page body. The field grows into it and then it separates, on one weighted
 * spring for both directions. Shared by `ComboboxContent` and `MultiSelectContent`.
 */
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  /** Which side of the field the panel opens on. */
  side?: 'top' | 'bottom'
  /** Alignment along the field's edge. */
  align?: 'start' | 'center' | 'end'
  /** Gap between field and panel, in px. */
  sideOffset?: number
  /** Flip to the other side when the preferred one does not fit. */
  avoidCollisions?: boolean
}>(), { side: 'bottom', align: 'start', sideOffset: 6, avoidCollisions: true })
defineSlots<{ default?(): unknown }>()

const MORPH = { type: 'spring', duration: 0.5, bounce: 0.22 } as const
const INSTANT = { duration: 0 } as const
const VIEWPORT_PADDING = 8

const context = useComboContext('ComboboxContent')
const panelEl = shallowRef<HTMLElement | null>(null)
const measureEl = shallowRef<HTMLElement | null>(null)
const mounted = shallowRef(false)
const morphReady = shallowRef(false)
let readyFrame = 0
onMounted(() => { mounted.value = true; readyFrame = requestAnimationFrame(() => requestAnimationFrame(() => { morphReady.value = true })) })
onBeforeUnmount(() => cancelAnimationFrame(readyFrame))
const { layout } = usePortalPosition(context.triggerEl, measureEl, mounted)
const open = context.open

const actualSide = shallowRef<'top' | 'bottom'>(props.side)
watch([open, layout, () => props.side, () => props.sideOffset, () => props.avoidCollisions], () => {
  // Preserve the resolved side during exit, so top panels close upward.
  const l = layout.value
  if (!open.value || !l) return
  if (!props.avoidCollisions) { actualSide.value = props.side; return }
  const below = innerHeight - (l.trigger.top + l.trigger.height)
  const above = l.trigger.top
  if (props.side === 'bottom' && below < l.content.height + props.sideOffset && above > below) actualSide.value = 'top'
  else if (props.side === 'top' && above < l.content.height + props.sideOffset && below > above) actualSide.value = 'bottom'
  else actualSide.value = props.side
}, { flush: 'pre' })

const transition = computed(() => context.reduce.value || !morphReady.value ? INSTANT : MORPH)
const panelAnimate = computed(() => ({
  height: open.value ? layout.value?.content.height ?? 0 : 0,
  opacity: open.value ? 1 : 0,
  y: open.value ? (actualSide.value === 'bottom' ? props.sideOffset : -props.sideOffset) : 0,
}))
const panelStyle = computed(() => {
  const l = layout.value
  const triggerLeft = l?.trigger.left ?? 0
  const triggerWidth = l?.trigger.width ?? 0
  const contentWidth = l?.content.width ?? triggerWidth
  const desired = props.align === 'end' ? triggerLeft + triggerWidth - contentWidth : props.align === 'center' ? triggerLeft + (triggerWidth - contentWidth) / 2 : triggerLeft
  const maxLeft = Math.max(VIEWPORT_PADDING, innerWidth - contentWidth - VIEWPORT_PADDING)
  return {
    left: `${Math.min(Math.max(desired, VIEWPORT_PADDING), maxLeft)}px`,
    top: actualSide.value === 'bottom' && l ? `${l.trigger.top + l.trigger.height}px` : undefined,
    bottom: actualSide.value === 'top' && l ? `${innerHeight - l.trigger.top}px` : undefined,
    minWidth: `${triggerWidth}px`,
    pointerEvents: open.value ? 'auto' : 'none',
    transformOrigin: actualSide.value === 'bottom' ? 'top' : 'bottom',
    visibility: l ? 'visible' : 'hidden',
    '--be-combo-width': `${triggerWidth}px`,
  } as Record<string, string | number | undefined>
})
const contentAttr = computed(() => ({ [`data-${context.kind}-content`]: '' }))

function setPanel(instance: unknown) {
  panelEl.value = (instance as { $el?: HTMLElement } | null)?.$el ?? null
  context.contentEl.value = panelEl.value
}
function setMeasure(instance: unknown) { measureEl.value = (instance as { $el?: HTMLElement } | null)?.$el ?? null }
</script>

<template>
  <Teleport v-if="mounted" to="body">
    <motion.div
      v-bind="{ ...$attrs, ...contentAttr }" :ref="setPanel" class="be-combo-panel" :data-side="actualSide" :aria-hidden="!open" :inert="(open ? undefined : '') as never"
      :initial="false" :animate="panelAnimate" :transition="transition" :style="panelStyle"
    >
      <motion.div :ref="setMeasure" :initial="false" :animate="{ opacity: open ? 1 : 0 }" :transition="transition">
        <slot />
      </motion.div>
    </motion.div>
  </Teleport>
</template>

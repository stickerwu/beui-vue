<script setup lang="ts">
import { motion, usePresence } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'

/**
 * The portalled surface of the morph popover (port of `MorphPopoverSurface` in
 * `components/motion/popover-morph.tsx`): a full-size panel revealed by an inset clip from the
 * corner nearest the trigger on one spring, retraced on close. The clip and the opacity are
 * driven by the motion element's own `animate` / `exit`, so the exit keeps playing after Vue
 * has unmounted the component.
 */
const props = withDefaults(defineProps<{
  anchor: HTMLElement | null
  id: string
  labelledBy?: string
  side?: 'top' | 'bottom'
  align?: 'start' | 'end'
  sideOffset?: number
  radius?: number
  shadow?: boolean
  width?: string
}>(), { side: 'bottom', align: 'end', sideOffset: 8, radius: 16, shadow: true })
const emit = defineEmits<{ opened: [content: HTMLElement] }>()

// Full-distance clip travel needs a shorter curve than the panel spring's slow overdamped tail.
const MORPH_ENTER = { type: 'spring', duration: 0.26, bounce: 0 } as const
const MORPH_EXIT = { duration: 0.2, ease: easeOut } as const

const reduceMotion = useReducedMotion()
const reduce = computed(() => Boolean(reduceMotion.value))
const outer = useTemplateRef<{ $el: HTMLElement }>('outer')
const inner = useTemplateRef<{ $el: HTMLElement }>('inner')
// Kept in a variable: the template ref is cleared when the component unmounts, before its exit ends.
let outerNode: HTMLElement | null = null
const outerEl = () => (outerNode = outer.value?.$el ?? outerNode)
const innerEl = () => inner.value?.$el ?? null
const present = shallowRef(true)

type Layout = { trigger: { left: number; top: number; width: number; height: number }; content: { width: number; height: number } }
const layout = shallowRef<Layout | null>(null)

function measure() {
  const trigger = props.anchor
  const content = innerEl()
  if (!trigger || !content) return
  const rect = trigger.getBoundingClientRect()
  const next: Layout = {
    trigger: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    content: { width: content.offsetWidth, height: content.offsetHeight },
  }
  const a = layout.value
  if (a && a.trigger.left === next.trigger.left && a.trigger.top === next.trigger.top && a.trigger.width === next.trigger.width && a.trigger.height === next.trigger.height && a.content.width === next.content.width && a.content.height === next.content.height) return
  layout.value = next
}

let observer: ResizeObserver | undefined
onMounted(() => {
  outerEl()
  measure()
  observer = new ResizeObserver(measure)
  if (props.anchor) observer.observe(props.anchor)
  const content = innerEl()
  if (content) observer.observe(content)
  window.addEventListener('scroll', measure, true)
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('scroll', measure, true)
  window.removeEventListener('resize', measure)
})

const gutter = 12
const geometry = computed(() => {
  const l = layout.value
  if (!l) return { left: 0, top: 0, side: props.side, available: 0 }
  const preferredLeft = props.align === 'end' ? l.trigger.left + l.trigger.width - l.content.width : l.trigger.left
  // Keep larger compositions inside the viewport: prefer the requested side, then the roomier one.
  const below = Math.max(0, window.innerHeight - l.trigger.top - l.trigger.height - props.sideOffset - gutter)
  const above = Math.max(0, l.trigger.top - props.sideOffset - gutter)
  const requested = props.side === 'bottom' ? below : above
  const other = props.side === 'bottom' ? above : below
  const side = l.content.height > requested && other > requested ? (props.side === 'bottom' ? 'top' : 'bottom') : props.side
  return {
    left: Math.max(gutter, Math.min(preferredLeft, window.innerWidth - l.content.width - gutter)),
    top: side === 'bottom' ? l.trigger.top + l.trigger.height + props.sideOffset : Math.max(gutter, l.trigger.top - l.content.height - props.sideOffset),
    side,
    available: side === 'bottom' ? below : above,
  }
})

const clipAt = (inset: number) => {
  const { side } = geometry.value
  const { align, radius } = props
  return `inset(${side === 'top' ? inset : 0}% ${align === 'start' ? inset : 0}% ${side === 'bottom' ? inset : 0}% ${align === 'end' ? inset : 0}% round ${radius}px)`
}
const ready = computed(() => layout.value !== null)
const closedClip = computed(() => clipAt(92))
const openClip = computed(() => clipAt(0))
// One progress value drives the clip and the opacity: opacity reaches 1 over the first 15%.
const OPACITY_IN = { duration: 0.05, ease: 'linear' } as const
const OPACITY_OUT = { duration: 0.16, delay: 0.04, ease: easeOut } as const
const FADE = { duration: 0.12 } as const

const outerInitial = computed(() => ({ opacity: 0 }))
const outerAnimate = computed(() => (ready.value ? { opacity: 1, transition: reduce.value ? FADE : OPACITY_IN } : { opacity: 0 }))
const outerExit = computed(() => ({ opacity: 0, transition: reduce.value ? FADE : OPACITY_OUT }))
const innerInitial = computed(() => ({ clipPath: closedClip.value }))
const innerAnimate = computed(() => ({ clipPath: ready.value ? openClip.value : closedClip.value, transition: MORPH_ENTER }))
const innerExit = computed(() => ({ clipPath: closedClip.value, transition: MORPH_EXIT }))

let opened = false
watch([ready, present], async () => {
  if (!ready.value || !present.value || opened) return
  opened = true
  await nextTick()
  const content = innerEl()
  if (content) emit('opened', content)
}, { flush: 'post', immediate: true })

// Interaction releases in the same commit that starts the exit (`PresenceGate`): the retained
// subtree is not re-rendered, so the gate goes straight onto the leaving element.
usePresence({
  element: outerEl,
  onExit() {
    present.value = false
    const el = outerEl()
    el?.setAttribute('inert', '')
    if (el) el.style.pointerEvents = 'none'
  },
  onEnter() {
    present.value = true
    const el = outerEl()
    el?.removeAttribute('inert')
    if (el) el.style.pointerEvents = ''
  },
})
</script>

<template>
  <motion.div
    ref="outer"
    data-morph-popover-portal=""
    class="drp-portal"
    :class="{ 'drp-portal-shadow': shadow }"
    :initial="outerInitial"
    :animate="outerAnimate"
    :exit="outerExit"
    :style="{
      left: `${geometry.left}px`,
      top: `${geometry.top}px`,
      pointerEvents: present ? 'auto' : 'none',
      visibility: layout ? 'visible' : 'hidden',
    }"
  >
    <motion.div
      :id="id"
      ref="inner"
      role="dialog"
      class="drp-surface"
      :aria-labelledby="labelledBy"
      tabindex="-1"
      :initial="reduce ? false : innerInitial"
      :animate="reduce ? undefined : innerAnimate"
      :exit="reduce ? undefined : innerExit"
      :style="{
        borderRadius: `${radius}px`,
        maxHeight: layout ? `${geometry.available}px` : undefined,
        overflowX: 'hidden',
        overflowY: 'auto',
        width,
        maxWidth: width ? 'calc(100vw - 1.5rem)' : undefined,
      }"
    >
      <slot />
    </motion.div>
  </motion.div>
</template>

<style scoped>
.drp-portal { position: fixed; z-index: 9999; }
/* A drop-shadow follows the clipped surface; box-shadow would be cut off by its own clip. */
.drp-portal-shadow { filter: drop-shadow(0 10px 18px rgb(0 0 0 / 0.14)); }
.drp-surface { box-sizing: border-box; border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); outline: none; }
.drp-surface:focus-visible { box-shadow: inset 0 0 0 2px var(--beui-ring); }
</style>

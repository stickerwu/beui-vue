<script lang="ts">
/** English defaults. Override per instance with `labels`. */
export const bottomSheetMessages = { label: 'Bottom sheet', close: 'Close bottom sheet' }
export type BottomSheetMessages = typeof bottomSheetMessages
</script>

<script setup lang="ts">
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import PresenceGate from './PresenceGate.vue'
import { easeDrawer, elementOf, useBodyLock, useFocusTrap } from './overlay-kit'

// `class` and other attributes land on the sheet itself, not on the teleport.
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  /** Heights (0-1 = fraction of viewport, or "auto"). First entry is default. */
  snapPoints?: (number | 'auto')[]
  defaultSnap?: number
  title?: string
  description?: string
  /** Min drag distance (px) past current snap to dismiss. */
  dismissThreshold?: number
  labels?: Partial<BottomSheetMessages>
}>(), { snapPoints: () => [0.5, 0.92], defaultSnap: 0, dismissThreshold: 120 })
const open = defineModel<boolean>('open', { default: false })
const t = computed(() => ({ ...bottomSheetMessages, ...props.labels }))

// Vaul-style glide: a long, fully-damped tween reads smoother than a spring on
// open — no settle or overshoot, just one clean decel. The same curve drives the
// scrim so the surface and scrim move as one.
const DRAWER = { duration: 0.5, ease: easeDrawer } as const

const snap = shallowRef(props.defaultSnap)
const mounted = shallowRef(false)
onMounted(() => { mounted.value = true })
const reduce = useReducedMotion()
const dragControls = useDragControls()
const sheet = useTemplateRef<unknown>('sheet')
const uid = useId()
const titleId = `${uid}-title`
const descriptionId = `${uid}-description`

watch(open, isOpen => { if (isOpen) snap.value = props.defaultSnap })

function close() { open.value = false }
useFocusTrap(() => open.value, () => elementOf(sheet.value), { onEscape: close })
// overflow:hidden alone is ignored by iOS Safari, so the body is pinned too.
useBodyLock(() => open.value, 'fixed')

function onDragEnd(_: unknown, info: PanInfo) {
  const velocity = info.velocity.y
  const offset = info.offset.y
  // Strong downward fling or large drag: dismiss, or step down one snap.
  if (velocity > 600 || offset > props.dismissThreshold) {
    const smaller = props.snapPoints.map((_, index) => index).filter(index => index < snap.value)
    if (smaller.length && velocity < 800 && offset < props.dismissThreshold * 1.6) snap.value = smaller[smaller.length - 1] as number
    else close()
    return
  }
  // Strong upward fling: next snap.
  if (velocity < -500) {
    snap.value = Math.min(props.snapPoints.length - 1, snap.value + 1)
    return
  }
  // Otherwise snap by how far it was dragged.
  if (offset > 80 && snap.value > 0) snap.value -= 1
  else if (offset < -80 && snap.value < props.snapPoints.length - 1) snap.value += 1
}

const heightStyle = computed(() => {
  const value = props.snapPoints[snap.value]
  return value === 'auto' || value === undefined ? { maxHeight: '92vh' } : { height: `${value * 100}vh` }
})
</script>

<template>
  <!-- Portal to <body>: an ancestor with backdrop-filter or transform becomes the
       containing block for fixed descendants. Two fixed siblings, no wrapper. -->
  <Teleport v-if="mounted" to="body">
    <AnimatePresence>
      <PresenceGate v-if="open" key="backdrop" v-slot="{ gate }">
        <motion.button type="button" class="be-sheet-backdrop" :aria-label="t.close" tabindex="-1"
          :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="DRAWER"
          :inert="gate.inert" :style="gate.style" @click="close" />
      </PresenceGate>
      <PresenceGate v-if="open" key="sheet" v-slot="{ gate }">
        <motion.div v-bind="$attrs" ref="sheet" class="be-sheet" drag="y" :drag-controls="dragControls" :drag-listener="false"
          :drag-constraints="{ top: 0, bottom: 0 }" :drag-elastic="{ top: 0.02, bottom: 0.4 }" :drag-momentum="false" @drag-end="onDragEnd"
          :initial="reduce ? { y: 0, opacity: 0 } : { y: '100%' }" :animate="reduce ? { y: 0, opacity: 1 } : { y: 0 }" :exit="reduce ? { y: 0, opacity: 0 } : { y: '100%' }"
          :transition="reduce ? { duration: 0.18, ease: easeDrawer } : DRAWER" :inert="gate.inert" :style="{ ...heightStyle, ...gate.style }"
          role="dialog" aria-modal="true" tabindex="-1" :aria-labelledby="title ? titleId : undefined" :aria-describedby="description ? descriptionId : undefined" :aria-label="title ? undefined : t.label">
          <div class="be-sheet-head">
            <!-- Drag only the pill so the title and description stay selectable. -->
            <div class="be-sheet-grip" @pointerdown="dragControls.start($event)"><div class="be-sheet-pill" /></div>
            <div v-if="title || description" class="be-sheet-text">
              <h2 v-if="title" :id="titleId">{{ title }}</h2>
              <p v-if="description" :id="descriptionId">{{ description }}</p>
            </div>
          </div>
          <div class="be-sheet-body"><slot :close="close" /></div>
        </motion.div>
      </PresenceGate>
    </AnimatePresence>
  </Teleport>
</template>

<style scoped>
.be-sheet-backdrop { pointer-events: auto; position: fixed; inset: 0; z-index: 50; padding: 0; border: 0; background: color-mix(in srgb, var(--beui-background) 40%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); cursor: pointer; }
.be-sheet { pointer-events: auto; position: fixed; right: 0; bottom: 0; left: 0; z-index: 50; box-sizing: border-box; display: flex; flex-direction: column; max-width: 42rem; margin-inline: auto; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1.5rem 1.5rem 0 0; background: var(--beui-background); color: var(--beui-foreground); box-shadow: 0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1); outline: none; will-change: transform; }
.be-sheet-head { display: flex; flex-direction: column; align-items: center; padding: .75rem 1rem .5rem; }
.be-sheet-grip { display: flex; align-items: center; justify-content: center; padding: .25rem 0; cursor: grab; touch-action: none; -webkit-touch-callout: none; }
.be-sheet-grip:active { cursor: grabbing; }
.be-sheet-pill { width: 2.5rem; height: .375rem; border-radius: 999px; background: color-mix(in srgb, var(--beui-muted-foreground) 40%, transparent); }
.be-sheet-text { width: 100%; margin-top: .5rem; }
.be-sheet-text h2 { margin: 0; font-size: 1rem; line-height: 1.5rem; font-weight: 600; color: var(--beui-foreground); }
.be-sheet-text p { margin: .125rem 0 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.be-sheet-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 0 1rem 1.5rem; }
@media (pointer: coarse) { .be-sheet-grip { user-select: none; } }
</style>

<script lang="ts">
// Moving along a row of controls should feel instant after the first label, and
// only one label may show at a time. Shared across every tip on the page.
const DELAY = 120
const SKIP_DELAY = 300
let lastClosedAt = 0
let current: { close: () => void } | null = null
</script>

<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { easeOut } from '../core/motion'

/** A tooltip around one control: a hover (after a short delay) or keyboard focus shows it. */
const props = defineProps<{ content: string }>()

const reduce = useReducedMotion()
const anchor = useTemplateRef<HTMLElement>('anchor')
const surface = useTemplateRef<{ $el?: HTMLElement } | HTMLElement>('surface')
const open = shallowRef(false)
// The portal renders only on the client, after mount: the server has no body to
// teleport into, so the first client render must match the server's empty slot.
const mounted = shallowRef(false)
onMounted(() => { mounted.value = true })
const position = shallowRef<{ left: number; top: number } | null>(null)
let timer: number | undefined
const self = { close }

function show() {
  if (open.value || !props.content) return
  current?.close()
  current = self
  open.value = true
}
function close() {
  window.clearTimeout(timer)
  if (!open.value) return
  open.value = false
  lastClosedAt = Date.now()
  if (current === self) current = null
}
function onPointerEnter(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  window.clearTimeout(timer)
  if (Date.now() - lastClosedAt < SKIP_DELAY) show()
  else timer = window.setTimeout(show, DELAY)
}
function onPointerLeave() { close() }
function onFocusIn(event: FocusEvent) {
  // Only keyboard focus shows it; a click focuses the button without a label.
  if ((event.target as HTMLElement).matches?.(':focus-visible')) show()
}

function place() {
  const trigger = anchor.value
  const reference = surface.value
  const tip = reference instanceof HTMLElement ? reference : reference?.$el
  if (!trigger || !tip) return
  const rect = trigger.getBoundingClientRect()
  const width = tip.offsetWidth
  const height = tip.offsetHeight
  const gap = 8
  const pad = 8
  const above = rect.top - height - gap
  const top = above >= pad ? above : rect.bottom + gap
  const left = Math.max(pad, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - pad))
  position.value = { left, top }
}

watch(open, async (isOpen, _previous, onCleanup) => {
  if (!isOpen) { position.value = null; return }
  await nextTick()
  place()
  const dismiss = (event: Event) => {
    if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return
    close()
  }
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', place)
  document.addEventListener('keydown', dismiss)
  onCleanup(() => {
    window.removeEventListener('scroll', close, true)
    window.removeEventListener('resize', place)
    document.removeEventListener('keydown', dismiss)
  })
}, { flush: 'post' })

onBeforeUnmount(() => {
  window.clearTimeout(timer)
  if (current === self) current = null
})
</script>

<template>
  <span ref="anchor" class="sch-tip" @pointerenter="onPointerEnter" @pointerleave="onPointerLeave" @pointerdown="close" @focusin="onFocusIn" @focusout="close">
    <slot />
    <Teleport v-if="mounted" to="body">
      <AnimatePresence>
        <motion.span
          v-if="open"
          ref="surface"
          key="tip"
          role="tooltip"
          class="sch-tip-surface"
          :style="{ left: `${position?.left ?? 0}px`, top: `${position?.top ?? 0}px`, visibility: position ? 'visible' : 'hidden' }"
          :initial="{ opacity: 0, scale: reduce ? 1 : 0.94 }"
          :animate="position ? { opacity: 1, scale: 1, transition: { duration: 0.18, ease: easeOut } } : { opacity: 0, scale: reduce ? 1 : 0.94 }"
          :exit="{ opacity: 0, scale: reduce ? 1 : 0.94, transition: { duration: 0.12, ease: easeOut } }">
          {{ content }}
        </motion.span>
      </AnimatePresence>
    </Teleport>
  </span>
</template>

<style scoped>
.sch-tip { display: inline-flex; }
.sch-tip-surface { pointer-events: none; position: fixed; z-index: 9999; display: block; box-sizing: border-box; max-width: min(20rem, calc(100vw - 16px)); white-space: nowrap; padding: .25rem .625rem; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); color: var(--beui-foreground); font-size: .75rem; line-height: 1rem; font-weight: 500; box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1); }
</style>

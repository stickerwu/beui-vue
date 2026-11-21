<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, provide, shallowRef, useTemplateRef, watch } from 'vue'
import { elementOf, useBodyLock } from '../overlay-kit'
import {
  animatedSidebarPanelKey,
  FOCUSABLE_SELECTOR,
  PANEL_TRANSITION,
  REDUCED_TRANSITION,
  useAnimatedSidebar,
  type SidebarSide,
} from './context'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ label: string; side: SidebarSide }>()
const { openMobile, reduce, setOpenMobile, t, triggerRef } = useAnimatedSidebar()
const panel = useTemplateRef<unknown>('panel')

// The sheet is mounted for as long as the viewport is mobile, so it hides
// itself while closed rather than sitting there transparent and interactive.
// Opening shows it before the slide starts: a delayed show would run the focus
// step below against a still-hidden panel, and focus() on a hidden element is
// ignored. Closing waits for the slide to finish, and the panel's own exit
// tells us when that is: no duration to keep in sync.
const hidden = shallowRef(!openMobile.value)
watch(openMobile, isOpen => { if (isOpen) hidden.value = false }, { flush: 'sync' })

provide(animatedSidebarPanelKey, { collapsed: computed(() => false), collapsible: computed(() => 'none' as const), side: computed(() => props.side) })

useBodyLock(() => openMobile.value, 'fixed')
watch(openMobile, (isOpen, _, onCleanup) => {
  if (!isOpen) return
  const frame = requestAnimationFrame(() => {
    const element = elementOf(panel.value)
    const first = element?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    ;(first ?? element)?.focus({ preventScroll: true })
  })
  onCleanup(() => {
    cancelAnimationFrame(frame)
    triggerRef.value?.focus({ preventScroll: true })
  })
}, { flush: 'post' })

function keydown(event: KeyboardEvent) {
  const element = elementOf(panel.value)
  if (event.key === 'Escape') {
    event.preventDefault()
    setOpenMobile(false)
    return
  }
  if (event.key !== 'Tab') return
  const focusable = element ? Array.from(element.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : []
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) {
    event.preventDefault()
    element?.focus()
    return
  }
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
function settled() {
  if (!openMobile.value) hidden.value = true
}
</script>

<template>
  <!-- This container groups the sheet for hiding and the z-index and carries no
       box: both children are fixed and resolve against the viewport themselves.
       The scrim spans the viewport edges but paints a colour, and the panel is
       inset off one side and paints its own surface, so no layer here is a
       transparent edge-spanning one. -->
  <Teleport to="body">
    <div class="be-asb-mobile" :class="hidden && !openMobile ? 'be-asb-mobile-hidden' : undefined">
      <motion.button
        type="button" class="be-asb-scrim" :class="{ 'be-asb-scrim-open': openMobile }" :aria-label="t.close" :tabindex="openMobile ? 0 : -1"
        :initial="false" :animate="{ opacity: openMobile ? 1 : 0 }" :transition="reduce ? REDUCED_TRANSITION : PANEL_TRANSITION"
        @click="setOpenMobile(false)"
      />
      <motion.div
        ref="panel" role="dialog" aria-modal="true" :aria-label="label" :aria-hidden="!openMobile" :inert="!openMobile" tabindex="-1"
        data-mobile="true" :data-state="openMobile ? 'expanded' : 'collapsed'" :data-side="side"
        class="be-asb-sheet" :class="[side === 'left' ? 'be-asb-sheet-left' : 'be-asb-sheet-right', { 'be-asb-sheet-open': openMobile }, $attrs.class]"
        :initial="false"
        :animate="{ opacity: reduce ? (openMobile ? 1 : 0) : 1, x: reduce ? 0 : openMobile ? '0%' : side === 'left' ? '-100%' : '100%' }"
        :transition="reduce ? REDUCED_TRANSITION : PANEL_TRANSITION"
        @animation-complete="settled" @keydown="keydown"
      >
        <slot />
      </motion.div>
    </div>
  </Teleport>
</template>

<style>
.be-asb-mobile { position: fixed; top: 0; left: 0; z-index: 50; width: 0; height: 0; pointer-events: none; }
.be-asb-mobile-hidden { visibility: hidden; }
@media (min-width: 768px) { .be-asb-mobile { display: none; } }
.be-asb-scrim { position: fixed; inset: 0; width: 100%; height: 100%; padding: 0; border: 0; background: rgb(0 0 0 / .4); pointer-events: none; cursor: default; }
.be-asb-scrim-open { pointer-events: auto; }
.be-asb-sheet {
  position: fixed; top: 0; bottom: 0; display: flex; flex-direction: column; box-sizing: border-box; width: var(--sidebar-width-mobile, 18rem); max-width: 88vw;
  height: 100dvh; overflow: hidden; border-color: var(--beui-border); background: var(--beui-background); color: var(--beui-foreground);
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / .25); outline: none; will-change: transform; pointer-events: none;
}
.be-asb-sheet-open { pointer-events: auto; }
.be-asb-sheet-left { left: 0; border-right: 1px solid var(--beui-border); }
.be-asb-sheet-right { right: 0; border-left: 1px solid var(--beui-border); }
</style>

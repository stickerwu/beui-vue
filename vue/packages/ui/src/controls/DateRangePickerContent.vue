<script setup lang="ts">
import { computed, inject, onBeforeUnmount, watch } from 'vue'
import DrpMorphPanel from './DrpMorphPanel.vue'
import { DRP_KEY } from './drp-core'

/** The popover that morphs out of the trigger. Put a `DateRangePickerCalendar` inside. */
const props = withDefaults(defineProps<{
  /** Move focus to the active calendar date when opened. */
  autoFocus?: boolean
  side?: 'bottom' | 'top'
  align?: 'start' | 'end'
  /** Gap between trigger and panel, in px. */
  sideOffset?: number
  /** Panel corner radius, in px. */
  radius?: number
  /** Draw the surface shadow. */
  shadow?: boolean
  /** Element to focus when a keyboard open shows the panel, instead of the active date. */
  initialFocus?: HTMLElement | null | (() => HTMLElement | null)
}>(), { autoFocus: true, side: 'bottom', align: 'start', radius: 16, shadow: false })
const emit = defineEmits<{
  /** Runs after the surface is positioned and visible, with its element. */
  openAutoFocus: [content: HTMLElement]
}>()
defineOptions({ inheritAttrs: false })
defineSlots<{ default?: () => unknown }>()
const ctx = inject(DRP_KEY)
if (!ctx) throw new Error('DateRangePickerContent must be used within DateRangePicker')

function focusCalendarDate(content: HTMLElement | null) {
  const target = typeof props.initialFocus === 'function' ? props.initialFocus() : props.initialFocus
  if (target) { target.focus({ preventScroll: true }); return }
  const grid = Array.from(content?.querySelectorAll<HTMLElement>('[role="grid"]') ?? []).find(element => !element.closest('[inert]'))
  const point = grid?.querySelector<HTMLElement>('button[tabindex="0"]') ?? grid
  point?.focus({ preventScroll: true })
}
function opened(content: HTMLElement) {
  ctx!.content.value = content
  if (props.autoFocus) focusCalendarDate(content)
  emit('openAutoFocus', content)
}
// A rapid reopen can revive the exiting surface before it unmounts, which already ran `opened`.
watch(ctx.open, isOpen => { if (isOpen && props.autoFocus) focusCalendarDate(ctx.content.value) }, { flush: 'post' })

// Closes on an outside pointer press or Escape.
function close() {
  ctx!.setOpen(false)
  const focused = document.activeElement
  if (focused instanceof HTMLElement && ctx!.content.value?.contains(focused)) ctx!.trigger.value?.focus()
}
let detach: (() => void) | undefined
watch(ctx.open, isOpen => {
  detach?.()
  detach = undefined
  if (!isOpen) return
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
  const onPointer = (event: PointerEvent) => {
    const target = event.target as Node
    if (ctx!.root.value && !ctx!.root.value.contains(target) && !ctx!.content.value?.contains(target)) close()
  }
  window.addEventListener('keydown', onKey)
  window.addEventListener('pointerdown', onPointer)
  detach = () => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('pointerdown', onPointer)
  }
})
onBeforeUnmount(() => detach?.())
const width = computed(() => '20rem')
</script>

<template>
  <DrpMorphPanel
    :open="ctx.open.value" :anchor="ctx.trigger.value" :id="ctx.contentId" :labelled-by="ctx.triggerId"
    :side="side" :align="align" :side-offset="sideOffset" :radius="radius" :shadow="shadow" :width="width"
    :content-class="($attrs.class as string | undefined)" @opened="opened">
    <slot />
  </DrpMorphPanel>
</template>

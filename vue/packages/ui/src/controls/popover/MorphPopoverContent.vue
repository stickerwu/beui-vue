<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, useAttrs, useSlots } from 'vue'
import { MORPH_PARTS_KEY, type MorphPart } from './pop-helpers'

defineOptions({ inheritAttrs: false })
/**
 * The panel of a `PopoverMorph` composed from parts. It renders nothing where it is written: the
 * popover portals its panel to the page body, so this only hands its props, slot and `class`/`style` over.
 */
const props = withDefaults(defineProps<{
  side?: 'top' | 'bottom'
  align?: 'start' | 'end'
  /** Gap between trigger and panel, in px. */
  sideOffset?: number
  /** Panel corner radius, in px. */
  radius?: number
  /** Draw the surface shadow. */
  shadow?: boolean
  /** Element that takes focus when the panel opens from the keyboard; falls back to the first focusable control. */
  initialFocus?: HTMLElement | null | (() => HTMLElement | null)
  /** Runs after the portalled surface is positioned and visible. Passing it hands focus to the caller. */
  onOpenAutoFocus?: (content: HTMLElement) => void
}>(), { shadow: undefined })
defineSlots<{
  /** Panel content. `close` shuts the popover. */
  default?(props: { close: () => void }): unknown
}>()
const parts = inject(MORPH_PARTS_KEY, null)
if (!parts) throw new Error('MorphPopoverContent must be used inside <PopoverMorph>')
const attrs = useAttrs()
const part: MorphPart = {
  props: {
    get side() { return props.side },
    get align() { return props.align },
    get sideOffset() { return props.sideOffset },
    get radius() { return props.radius },
    get shadow() { return props.shadow },
    get initialFocus() { return props.initialFocus },
    get onOpenAutoFocus() { return props.onOpenAutoFocus },
  },
  attrs,
  slots: useSlots() as MorphPart['slots'],
}
onMounted(() => parts.register(part))
onBeforeUnmount(() => parts.unregister(part))
</script>

<template><!-- the panel is rendered by the parent PopoverMorph --></template>

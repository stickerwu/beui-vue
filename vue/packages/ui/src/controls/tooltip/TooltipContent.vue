<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, useAttrs, useSlots } from 'vue'
import { PARTS_KEY, type TooltipAlign, type TooltipPart, type TooltipPoint, type TooltipSide } from './tip-shared'

defineOptions({ inheritAttrs: false })
/**
 * The surface of a `Tooltip` composed from parts. It renders nothing where it is written: the
 * tooltip portals its content to the page body, so this only hands its props and slot over.
 * A `class` on it styles the tooltip surface.
 */
const props = defineProps<{
  side?: TooltipSide
  align?: TooltipAlign
  /** Gap between anchor and tooltip (px). */
  sideOffset?: number
  /** Draw an arrow pointing at the anchor. */
  arrow?: boolean
  /** Point within the anchor, as fractions of its rendered width and height. */
  anchorPoint?: TooltipPoint
}>()
defineSlots<{ default?(): unknown }>()

const parts = inject(PARTS_KEY, null)
if (!parts) throw new Error('TooltipContent must be used inside <Tooltip>')
const attrs = useAttrs()
// Getters keep the tooltip reading current values without copying them.
const part: TooltipPart = {
  props: {
    get side() { return props.side },
    get align() { return props.align },
    get sideOffset() { return props.sideOffset },
    get arrow() { return props.arrow },
    get anchorPoint() { return props.anchorPoint },
    get class() { return attrs.class },
  },
  slots: useSlots() as TooltipPart['slots'],
}
onMounted(() => parts.register(part))
onBeforeUnmount(() => parts.unregister(part))
</script>

<template><!-- content is rendered by the parent Tooltip --></template>

<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, useAttrs, useSlots } from 'vue'
import { POPOVER_PARTS_KEY, type PopoverPart } from './pop-helpers'

defineOptions({ inheritAttrs: false })
/**
 * The panel of a `Popover` composed from parts. It renders nothing where it is written: the
 * popover portals its panel to the page body, so this only hands its slot and `class`/`style` over.
 */
defineSlots<{
  /** Panel content. `close` shuts the popover. */
  default?(props: { close: () => void }): unknown
}>()
const parts = inject(POPOVER_PARTS_KEY, null)
if (!parts) throw new Error('PopoverContent must be used inside <Popover>')
const part: PopoverPart = { attrs: useAttrs(), slots: useSlots() as PopoverPart['slots'] }
onMounted(() => parts.register(part))
onBeforeUnmount(() => parts.unregister(part))
</script>

<template><!-- the panel is rendered by the parent Popover --></template>

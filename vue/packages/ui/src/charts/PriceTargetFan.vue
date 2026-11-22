<script setup lang="ts">
import PriceTargetFanHeader from './PriceTargetFanHeader.vue'
import PriceTargetFanPlot from './PriceTargetFanPlot.vue'
import { providePriceTargetFan, usePriceTargetFanModel, type PriceTargetFanEmit, type PriceTargetFanProps } from './price-target-fan-context'

defineSlots<{
  /** Compose `PriceTargetFanHeader` and `PriceTargetFanPlot`; omit it for the complete chart. */
  default?(): unknown
}>()
const props = defineProps<PriceTargetFanProps>()
const emit = defineEmits<{
  'update:active': [value: PriceTargetFanProps['active']]
  activeChange: [value: PriceTargetFanProps['active']]
}>()
providePriceTargetFan(usePriceTargetFanModel(props, emit as PriceTargetFanEmit))
</script>

<template>
  <div class="ptf" data-slot="price-target-fan">
    <slot>
      <PriceTargetFanHeader />
      <PriceTargetFanPlot />
    </slot>
  </div>
</template>

<style>
.ptf { --ptf-success: oklch(70% 0.18 155); --ptf-warning: oklch(78% 0.18 75); --ptf-accent: var(--beui-accent, oklch(72% 0.18 195)); --ptf-border: var(--beui-border); --ptf-border-strong: oklch(15% 0 0 / 0.12); --ptf-ink-l: 0.5; box-sizing: border-box; width: 520px; max-width: 100%; }
:where(.dark, [data-beui-theme="dark"]) .ptf { --ptf-border-strong: rgb(255 255 255 / 0.1); --ptf-ink-l: 1; }
</style>

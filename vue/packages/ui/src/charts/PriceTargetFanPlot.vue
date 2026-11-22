<script setup lang="ts">
/** HTML positioning container. Place `PriceTargetFanTooltip` beside the svg, never inside it. */
import PriceTargetFanSvg from './PriceTargetFanSvg.vue'
import PriceTargetFanTooltip from './PriceTargetFanTooltip.vue'

defineSlots<{
  /** Compose `PriceTargetFanSvg` and `PriceTargetFanTooltip`; omit it for the default pair. */
  default?(): unknown
}>()
</script>

<template>
  <div class="plot" data-slot="price-target-fan-plot">
    <slot>
      <PriceTargetFanSvg />
      <PriceTargetFanTooltip />
    </slot>
  </div>
</template>

<style scoped>
.plot { position: relative; }
</style>

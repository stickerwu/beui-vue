<script setup lang="ts">
import { motion } from 'motion-v'
import { easeOut, panelSpring } from '../core/motion'
import { ptfInk, usePriceTargetFan } from './price-target-fan-context'

const { geo, hotT, setHotT, setActive, tooltipId, clipId, reduce, fmt, t } = usePriceTargetFan()
function onKey(event: KeyboardEvent, index: number) {
  if (event.key === 'Escape') { event.preventDefault(); setActive(null) }
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setHotT(hotT.value === index ? null : index) }
}
// a tap toggles on touch, where hover never fires; mouse and pen keep hover
function onTouch(event: PointerEvent, index: number) {
  if (event.pointerType === 'touch') { event.preventDefault(); setHotT(hotT.value === index ? null : index) }
}
</script>

<template>
  <g data-slot="price-target-fan-targets">
    <!-- projections and target labels -->
    <g :clip-path="`url(#${clipId})`">
      <g v-for="(p, i) in geo.proj" :key="p.key" class="target" :class="{ dim: hotT !== null && hotT !== i, still: reduce }" role="button" tabindex="0" :aria-label="t('targetButton', { key: p.key, price: fmt(p.price), analysts: p.analysts })"
        :aria-pressed="hotT === i" :aria-describedby="hotT === i ? tooltipId : undefined" @focus="setHotT(i)" @blur="setHotT(null)" @pointerdown="onTouch($event, i)" @keydown="onKey($event, i)">
        <path :d="p.d" fill="none" stroke="transparent" stroke-width="16" />
        <path :d="p.d" fill="none" :stroke="p.color" :stroke-width="hotT === i ? 2.2 : 1.4" :stroke-opacity="hotT === i ? 1 : 0.75" stroke-dasharray="2 4" stroke-linecap="round" />
        <!-- the hot projection draws itself solid over the dashes, base to target -->
        <motion.path v-if="hotT === i" tabindex="-1" :d="p.d" fill="none" :stroke="p.color" stroke-width="2.2" stroke-linecap="round" :initial="{ pathLength: reduce ? 1 : 0 }" :animate="{ pathLength: 1 }" :transition="reduce ? { duration: 0 } : { duration: 0.35, ease: easeOut }" />
        <motion.circle tabindex="-1" :cx="geo.endX" :cy="p.ty" fill="var(--beui-background)" :stroke="p.color" stroke-width="1.6" :r="3.2" :animate="{ r: hotT === i ? 4.5 : 3.2 }" :transition="reduce ? { duration: 0 } : panelSpring" />
        <text class="value" :x="geo.endX + 10" :y="p.ty + 4" :fill="ptfInk(p.color)">{{ p.price }}</text>
      </g>
    </g>
  </g>
</template>

<style scoped>
.target { outline: none; transition: opacity .25s cubic-bezier(.16, 1, .3, 1); }
.target.dim { opacity: .3; }
.target.still { transition: none; }
.target:focus-visible { outline: none; }
.value { font-family: var(--font-geist-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 11px; font-weight: 600; font-variant-numeric: tabular-nums; }
</style>

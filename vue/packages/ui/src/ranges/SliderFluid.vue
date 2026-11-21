<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import { type SliderBaseProps } from './types'
import { useGlidePosition, useSlider } from './use-slider'

/**
 * Thumbless slider: the whole pill is the control. The fill glides to the new
 * value behind a rounded liquid cap, and the label reads inverted wherever the
 * fill has covered it.
 */
const props = defineProps<SliderBaseProps & {
  /** Formats the value shown on the right. */
  format?: (value: number) => string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number], valueChange: [value: number] }>()
// The value arrives already snapped to the step. Rounding it again would only
// make the label and the announcement disagree with aria-valuenow.
const format = (value: number) => (props.format ? props.format(value) : `${value}%`)
const { sliderRef, percent, current, dragging, trackEvents, aria, onKeyDown } = useSlider(props, value => {
  emit('update:modelValue', value)
  emit('valueChange', value)
}, { formatValueText: format })
const { pos, reduce } = useGlidePosition(percent)
const SPRING_PRESS = { type: 'spring', stiffness: 500, damping: 30, mass: 0.6 } as const

// Reveal the fill by clipping a full-width layer rather than animating its
// width: at 0% the clip is empty, so no hairline of a sub-pixel-wide box is
// left behind, and the label inside is never scaled or re-laid out.
const clipPath = useTransform(() => `inset(0 ${100 - pos.get()}% 0 0 round 9999px)`)
</script>

<template>
  <motion.div
    class="be-fluid"
    :class="{ 'be-fluid-disabled': disabled }"
    :initial="false"
    :animate="reduce ? undefined : { scale: dragging ? 1.03 : 1 }"
    :transition="SPRING_PRESS"
    v-bind="trackEvents"
  >
    <!-- uncovered label — sits on the muted track -->
    <div class="be-fluid-row be-fluid-on-track" aria-hidden="true">
      <span v-if="label" class="be-fluid-label">{{ label }}</span><span v-else />
      <span class="be-fluid-value">{{ format(current) }}</span>
    </div>
    <!-- fill + the same label, both clipped to the value, so the text inverts as
         the fill covers it and lines up glyph for glyph with the copy
         underneath. The clip's rounded right edge is the liquid cap. -->
    <motion.div class="be-fluid-clip" :style="{ clipPath }">
      <div class="be-fluid-fill" />
      <div class="be-fluid-row be-fluid-on-fill" aria-hidden="true">
        <span v-if="label" class="be-fluid-label">{{ label }}</span><span v-else />
        <span class="be-fluid-value">{{ format(current) }}</span>
      </div>
    </motion.div>
    <!-- focusable, keyboard-controlled handle surface. The ring is inset — an
         outset one is clipped away by the track's overflow-hidden. -->
    <button ref="sliderRef" type="button" v-bind="aria" class="be-fluid-button" @keydown="onKeyDown" />
  </motion.div>
</template>

<style scoped>
.be-fluid {
  position: relative; display: flex; box-sizing: border-box; width: 100%; height: 3rem; overflow: hidden; border-radius: 999px;
  background: var(--beui-muted); touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  cursor: grab; color: var(--beui-foreground);
}
.be-fluid:active { cursor: grabbing; }
.be-fluid-disabled { pointer-events: none; opacity: .5; }
.be-fluid-row { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 1.25rem; pointer-events: none; font-size: .875rem; line-height: 1.25rem; font-weight: 500; }
.be-fluid-on-track { color: var(--beui-foreground); }
.be-fluid-on-fill { color: var(--beui-background); }
.be-fluid-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-fluid-value { font-variant-numeric: tabular-nums; }
.be-fluid-clip { position: absolute; inset: 0; }
.be-fluid-fill { position: absolute; inset: 0; background: var(--beui-foreground); }
.be-fluid-button { position: absolute; inset: 0; box-sizing: border-box; margin: 0; padding: 0; border: 0; border-radius: 999px; background: none; outline: none; touch-action: none; }
.be-fluid-button:focus-visible { box-shadow: inset 0 0 0 4px color-mix(in srgb, var(--beui-foreground) 40%, transparent); }
</style>

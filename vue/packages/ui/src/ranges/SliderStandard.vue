<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { type SliderBaseProps } from './types'
import { observeWidth, useGlidePosition, useSlider } from './use-slider'

const props = withDefaults(defineProps<SliderBaseProps & { showTicks?: boolean }>(), { showTicks: true })
const emit = defineEmits<{ 'update:modelValue': [value: number], valueChange: [value: number] }>()
const { sliderRef, percent, dragging, min, max, step, trackEvents, aria, onKeyDown } = useSlider(props, value => {
  emit('update:modelValue', value)
  emit('valueChange', value)
})
const { pos, reduce } = useGlidePosition(percent)

// Bouncy grab feedback for the thumb scale only.
const SPRING_BOUNCY = { type: 'spring', stiffness: 500, damping: 14, mass: 0.7 } as const

const track = useTemplateRef<HTMLElement>('track')
const trackWidth = shallowRef(292)
let stopObserving = () => {}
onMounted(() => { stopObserving = observeWidth(trackWidth, () => track.value) })
onBeforeUnmount(() => stopObserving())

// Spring-smoothed position drives both the thumb and the fill.
const thumbX = useTransform(() => 8 + Math.max(0, trackWidth.value - 20) * pos.get() / 100)
// The 4px handle starts 8px inside the track and the rounded fill extends 8px
// past its left edge. Translate a full-size fill inside the 2px inset clip so
// its corner never stretches.
const fillX = useTransform(() => {
  const p = pos.get()
  return p >= 100 ? '0%' : `calc(${p - 100}% + ${14 - 0.16 * p}px)`
})

// Floor rather than round, so a range the step does not divide (0 to 10 by 4)
// stops its dots at the last whole step instead of drawing one past max.
// toFixed comes first because 0.3/0.1 is 2.9999999999999996, which would floor
// to 2 and drop the last dot.
const ticks = computed(() => {
  const steps = Math.floor(Number(((max.value - min.value) / step.value).toFixed(6)))
  return props.showTicks && steps > 0 && steps <= 50
    ? Array.from({ length: steps + 1 }, (_, index) => Number((min.value + index * step.value).toFixed(6)))
    : []
})
</script>

<template>
  <div ref="track" class="be-slider" :class="{ 'be-slider-disabled': disabled }" v-bind="trackEvents">
    <div class="be-slider-fill" aria-hidden="true">
      <motion.div class="be-slider-fill-bar" :style="{ x: fillX }" />
    </div>
    <!-- Tick centres follow the same inset path as the handle centre. -->
    <div class="be-slider-ticks" aria-hidden="true">
      <span v-for="tick in ticks" :key="tick" class="be-slider-tick" :style="{ left: `${((tick - min) / (max - min)) * 100}%` }" />
    </div>
    <!-- Keep the handle inside the rounded progress fill at both ends. -->
    <motion.div
      ref="sliderRef"
      v-bind="aria"
      class="be-slider-thumb"
      :initial="false"
      :animate="reduce ? undefined : { scaleY: dragging ? 1.35 : 1 }"
      :transition="SPRING_BOUNCY"
      :style="{ x: thumbX, y: '-50%' }"
      @keydown="onKeyDown"
    />
  </div>
</template>

<style scoped>
.be-slider {
  position: relative; display: flex; align-items: center; box-sizing: border-box; width: 100%; height: 2.5rem; overflow: hidden;
  border-radius: .5rem; background: var(--beui-muted); touch-action: none; user-select: none; -webkit-user-select: none;
  -webkit-touch-callout: none; cursor: grab; color: var(--beui-foreground);
}
.be-slider:active { cursor: grabbing; }
.be-slider-disabled { pointer-events: none; opacity: .5; }
.be-slider-fill { position: absolute; inset: 0 2px; overflow: hidden; border-radius: .5rem; pointer-events: none; }
.be-slider-fill-bar { position: absolute; inset: 0; border-radius: .5rem; background: color-mix(in srgb, var(--beui-foreground) 15%, transparent); }
.be-slider-ticks { position: absolute; inset: 0 10px; pointer-events: none; }
.be-slider-tick { position: absolute; top: 50%; width: .25rem; height: .25rem; transform: translate(-50%, -50%); border-radius: 999px; background: color-mix(in srgb, var(--beui-foreground) 25%, transparent); }
.be-slider-thumb { position: absolute; left: 0; top: 50%; width: .25rem; height: 1.5rem; border-radius: 999px; background: var(--beui-foreground); outline: none; }
.be-slider-thumb:focus-visible { box-shadow: inset 0 0 0 4px color-mix(in srgb, var(--beui-foreground) 30%, transparent); }
</style>

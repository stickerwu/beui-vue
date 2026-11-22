<script setup lang="ts">
import { computed } from 'vue'
import ColorPickerChannelSlider from './ColorPickerChannelSlider.vue'
import { fillTemplate, keyStep, useColorPickerContext } from './color-picker-context'

/** Hue slider, 0 to 360 degrees. */
const props = defineProps<{
  /** Accessible name for the thumb. Default "Hue". */
  label?: string
}>()

const context = useColorPickerContext('ColorPickerHue')
const channels = context.channels
const TRACK = 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
const now = computed(() => Math.round(channels.value.hue))
function point(fraction: number) { context.update({ ...channels.value, hue: fraction * 360 }) }
function keys(event: KeyboardEvent) {
  if (context.disabled.value) return
  const step = keyStep(event, 10)
  if (!step) return
  event.preventDefault()
  if (step === 'min') context.update({ ...channels.value, hue: 0 })
  else if (step === 'max') context.update({ ...channels.value, hue: 360 })
  else context.update({ ...channels.value, hue: channels.value.hue + step.delta })
  context.commit()
}
</script>

<template>
  <ColorPickerChannelSlider
    :track="TRACK" :position="channels.hue / 3.6" :thumb-color="`hsl(${channels.hue} 100% 50%)`"
    :label="props.label ?? context.t.value.hue" :min="0" :max="360" :now="now"
    :value-text="fillTemplate(context.t.value.hueValue, { value: now })" :on-point="point" :on-keys="keys" />
</template>

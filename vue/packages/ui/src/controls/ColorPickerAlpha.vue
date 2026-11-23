<script setup lang="ts">
import { computed } from 'vue'
import ColorPickerChannelSlider from './ColorPickerChannelSlider.vue'
import { fillTemplate, keyStep, useColorPickerContext } from './color-picker-context'

/** Opacity slider. Renders nothing when the picker has `alpha` off. */
const props = defineProps<{
  /** Accessible name for the thumb. Default "Opacity". */
  label?: string
}>()

const context = useColorPickerContext('ColorPickerAlpha')
const channels = context.channels
const now = computed(() => Math.round(channels.value.alpha * 100))
const rgb = computed(() => context.rgb.value.join(' '))
const track = computed(() => `linear-gradient(to right, rgb(${rgb.value} / 0), rgb(${rgb.value})), repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px`)
// Whole percents, as the slider reports them, so the hex suffix does not flicker between neighbours.
function point(fraction: number) { context.update({ ...channels.value, alpha: Math.round(fraction * 100) / 100 }) }
function keys(event: KeyboardEvent) {
  if (context.disabled.value) return
  const step = keyStep(event, 10)
  if (!step) return
  event.preventDefault()
  const percent = Math.round(channels.value.alpha * 100)
  if (step === 'min') context.update({ ...channels.value, alpha: 0 })
  else if (step === 'max') context.update({ ...channels.value, alpha: 1 })
  else context.update({ ...channels.value, alpha: (percent + step.delta) / 100 })
  context.commit()
}
</script>

<template>
  <ColorPickerChannelSlider
    v-if="context.alpha.value" checker :track="track" :position="channels.alpha * 100" :thumb-color="`rgb(${rgb} / ${channels.alpha})`"
    :label="props.label ?? context.t.value.opacity" :min="0" :max="100" :now="now"
    :value-text="fillTemplate(context.t.value.opacityValue, { value: now })" :on-point="point" :on-keys="keys" />
</template>

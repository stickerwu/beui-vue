<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { fromHsl, fromRgb, toHsl } from './colors'
import { useColorPickerContext } from './color-picker-context'

/** Three numeric fields for the chosen format: red, green and blue, or hue, saturation and lightness. */
const props = withDefaults(defineProps<{
  format?: 'rgb' | 'hsl'
}>(), { format: 'rgb' })

const context = useColorPickerContext('ColorPickerChannels')
const channels = context.channels
const values = computed(() => (props.format === 'rgb' ? context.rgb.value : toHsl(channels.value)))
const labels = computed(() => (props.format === 'rgb'
  ? [context.t.value.red, context.t.value.green, context.t.value.blue]
  : [context.t.value.hue, context.t.value.saturation, context.t.value.lightness]))
const names = computed(() => (props.format === 'rgb' ? ['R', 'G', 'B'] : ['H', 'S', 'L']))
const draft = shallowRef<string | null>(null)
const limit = (index: number) => (props.format === 'rgb' ? 255 : index === 0 ? 360 : 100)

function setChannel(index: number, value: number) {
  const next = [...values.value]
  next[index] = value
  context.update(props.format === 'rgb' ? fromRgb(next, channels.value) : fromHsl(next, channels.value))
}
function input(index: number, event: Event) {
  const next = (event.target as HTMLInputElement).value.replace(/[^\d]/g, '').slice(0, 3)
  draft.value = next
  if (next !== '') setChannel(index, Math.min(limit(index), Number(next)))
}
function keys(index: number, event: KeyboardEvent) {
  const current = Math.round(values.value[index] ?? 0)
  const delta = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0
  if (delta) {
    event.preventDefault()
    draft.value = null
    setChannel(index, Math.min(limit(index), Math.max(0, current + delta * (event.shiftKey ? 10 : 1))))
    context.commit()
  } else if (event.key === 'Enter') {
    draft.value = null
    context.commit()
  }
}
function blur() {
  if (draft.value !== null) context.commit()
  draft.value = null
}
</script>

<template>
  <div class="be-picker-channels">
    <label v-for="(value, index) in values" :key="`${format}-${index}`" class="be-picker-channel">
      <input
        class="be-picker-field be-picker-channel-field" type="text" inputmode="numeric" autocomplete="off"
        :disabled="context.disabled.value" :aria-label="labels[index]" :value="draft ?? String(Math.round(value ?? 0))"
        @input="input(index, $event)" @blur="blur" @keydown="keys(index, $event)">
      <span aria-hidden="true" class="be-picker-channel-name">{{ names[index] }}</span>
    </label>
  </div>
</template>

<style>
.be-picker-channels { display: flex; min-width: 0; flex: 1; gap: .375rem; }
.be-picker-channel { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: center; gap: .25rem; }
.be-picker-channel-field { padding: 0 .25rem; text-align: center; }
.be-picker-channel-name { font-size: .6875rem; font-weight: 500; color: var(--beui-muted-foreground); }
</style>

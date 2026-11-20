<script setup lang="ts">
import { computed, shallowRef } from 'vue'

const props = defineProps<{
  label: string; values: readonly string[]; index: number; band?: boolean; vertical?: boolean; describedBy?: string
}>()
const emit = defineEmits<{ inspect: [index: number]; close: [] }>()
const cursor = computed(() => props.index < 0 ? Math.max(0, props.values.length - 1) : props.index)
const pointerDriven = shallowRef(false)
let pointerFocus = false
let previous: number | null = null
function hit(event: PointerEvent) {
  if (event.type === 'pointerdown') { pointerDriven.value = true; pointerFocus = true; previous = null }
  if (!pointerDriven.value && (event.pointerType === 'touch' || !window.matchMedia('(any-hover: hover)').matches)) return
  const box = (event.currentTarget as HTMLInputElement).getBoundingClientRect()
  const fraction = props.vertical ? (event.clientY - box.top) / box.height : (event.clientX - box.left) / box.width
  const ratio = Math.max(0, Math.min(1, fraction))
  const last = props.values.length - 1
  const next = props.band ? Math.min(last, Math.floor(ratio * props.values.length)) : Math.round(ratio * last)
  if (next !== previous) { emit('inspect', next); previous = next }
}
function keys(event: KeyboardEvent) {
  pointerDriven.value = false
  pointerFocus = false
  if (event.key === 'Escape') emit('close')
  else if (props.vertical && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault()
    emit('inspect', Math.max(0, Math.min(props.values.length - 1, cursor.value + (event.key === 'ArrowDown' ? 1 : -1))))
  } else if (['Home', 'End', 'PageUp', 'PageDown', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) emit('inspect', cursor.value)
}
function leave(event: PointerEvent) {
  previous = null
  if (event.pointerType !== 'touch' && (pointerFocus || document.activeElement !== event.currentTarget)) emit('close')
}
</script>

<template>
  <input v-if="values.length" type="range" class="chart-inspector" :aria-label="label" :aria-orientation="vertical ? 'vertical' : 'horizontal'"
    :aria-valuetext="values[cursor]" :aria-describedby="describedBy" :min="0" :max="values.length - 1" :value="cursor" step="1"
    @focus="!pointerFocus && emit('inspect', cursor)" @blur="pointerDriven = false; pointerFocus = false; emit('close')"
    @pointerdown="hit" @pointerenter="hit" @pointermove="hit" @pointerup="pointerDriven = false"
    @pointerleave="leave"
    @pointercancel="pointerDriven = false; emit('close')" @keydown="keys" @input="!pointerDriven && emit('inspect', ($event.currentTarget as HTMLInputElement).valueAsNumber)" />
</template>

<style scoped>
.chart-inspector { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: crosshair; touch-action: pan-y; }
</style>

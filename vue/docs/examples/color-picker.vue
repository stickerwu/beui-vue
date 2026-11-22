<script setup lang="ts">
import {
  ColorPicker, ColorPickerAlpha, ColorPickerArea, ColorPickerChannels, ColorPickerContent, ColorPickerEyeDropper,
  ColorPickerHexInput, ColorPickerHue, ColorPickerPreset, ColorPickerPresets, ColorPickerSwatch, ColorPickerTrigger,
} from 'beui-vue'
import { computed, ref } from 'vue'

const FORMATS = ['hex', 'rgb', 'hsl'] as const
const color = ref('#3478f6')
const format = ref<(typeof FORMATS)[number]>('hex')
const next = computed(() => FORMATS[(FORMATS.indexOf(format.value) + 1) % FORMATS.length]!)
const presets = [
  { label: 'Blue', value: '#3478f6' }, { label: 'Purple', value: '#9270e8' },
  { label: 'Pink', value: '#e66aa4' }, { label: 'Red', value: '#e55656' },
  { label: 'Orange', value: '#ed9141' }, { label: 'Amber', value: '#e5b63c' },
  { label: 'Green', value: '#65a65a' }, { label: 'Teal', value: '#169d83' },
]
</script>
<template>
  <div class="preview">
    <ColorPicker v-model="color" aria-label="Brand color">
      <ColorPickerTrigger />
      <ColorPickerContent>
        <ColorPickerArea />
        <div class="row">
          <ColorPickerEyeDropper />
          <div class="sliders">
            <ColorPickerHue />
            <ColorPickerAlpha />
          </div>
        </div>
        <div class="fields">
          <button type="button" class="format" :aria-label="`Format ${format.toUpperCase()}, switch to ${next.toUpperCase()}`" @click="format = next">
            <Transition name="format" mode="out-in"><span :key="format">{{ format.toUpperCase() }}</span></Transition>
          </button>
          <ColorPickerHexInput v-if="format === 'hex'" />
          <ColorPickerChannels v-else :format="format" />
          <ColorPickerSwatch v-if="format === 'hex'" />
        </div>
        <ColorPickerPresets>
          <ColorPickerPreset v-for="preset in presets" :key="preset.value" :value="preset.value" :label="preset.label" />
        </ColorPickerPresets>
      </ColorPickerContent>
    </ColorPicker>
  </div>
</template>
<style scoped>
.preview { display: flex; min-height: 460px; width: 100%; justify-content: center; padding-top: .5rem; }
.row { display: flex; align-items: center; gap: .75rem; }
.sliders { display: flex; flex: 1; flex-direction: column; gap: .75rem; }
.fields { display: flex; align-items: flex-start; gap: .375rem; }
.format { display: inline-flex; box-sizing: border-box; height: 2.25rem; width: 3rem; flex: none; align-items: center; justify-content: center; overflow: hidden; padding: 0; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; line-height: 1rem; font-weight: 500; outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1); }
.format:hover { color: var(--beui-foreground); }
.format:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.format-enter-active, .format-leave-active { transition: opacity .15s, transform .15s; }
.format-enter-from { opacity: 0; transform: translateY(10px); }
.format-leave-to { opacity: 0; transform: translateY(-10px); }
@media (prefers-reduced-motion: reduce) { .format-enter-from, .format-leave-to { transform: none; } }
</style>

<script setup lang="ts">
import {
  ColorPicker, ColorPickerAlpha, ColorPickerArea, ColorPickerContent, ColorPickerHexInput, ColorPickerHue,
  ColorPickerPreset, ColorPickerPresets, ColorPickerSwatch, ColorPickerTrigger,
} from 'beui-vue'
import { shallowRef, toRef } from 'vue'
import { useLocale } from '../i18n'
import { useLoop } from './use-loop'

const props = defineProps<{ playing: boolean }>()
const { t } = useLocale()

const brand = shallowRef('#3478f6')
const open = shallowRef(false)
const inline = shallowRef('#e66aa4')

// The upstream clip taps the chip, drags across the color area and closes the
// popover; the inline picker then sweeps its hue.
const drag = ['#5b8ff0', '#3f6fd6', '#2a9bd1', '#20b39a', '#4fbf6b']
const presets = ['#3478f6', '#9270e8', '#e66aa4', '#e55656', '#ed9141', '#e5b63c', '#65a65a', '#169d83']
const sweep = ['#d65ae6', '#8f5ae6', '#5a7be6', '#e66aa4']
useLoop(toRef(props, 'playing'), [
  { at: 900, run: () => { open.value = true } },
  ...drag.map((value, index) => ({ at: 1700 + index * 420, run: () => { brand.value = value } })),
  { at: 4400, run: () => { open.value = false } },
  ...sweep.map((value, index) => ({ at: 5200 + index * 700, run: () => { inline.value = value } })),
  { at: 8400, run: () => { brand.value = '#3478f6' } },
], 9400)
</script>

<template>
  <p class="ph-lead">{{ t('A popover picker with a loupe under your finger.') }}</p>
  <section class="ph-section">
    <p class="ph-h">Popover</p>
    <p class="ph-note">{{ t('Tap the chip to open the picker. Drag the color area, and a loupe lifts above your finger to show the color under it.') }}</p>
    <!-- The native chip keeps its color while the popover is open. -->
    <div class="ph-demo ph-color" :style="{ '--ph-chip': brand }">
      <ColorPicker v-model="brand" v-model:open="open" aria-label="Brand color">
        <ColorPickerTrigger />
        <ColorPickerContent>
          <ColorPickerArea />
          <ColorPickerHue />
          <ColorPickerAlpha />
          <div class="ph-fields"><span class="ph-format">HEX</span><ColorPickerHexInput /><ColorPickerSwatch /></div>
          <ColorPickerPresets>
            <ColorPickerPreset v-for="preset in presets" :key="preset" :value="preset" />
          </ColorPickerPresets>
        </ColorPickerContent>
      </ColorPicker>
      <p class="ph-brand"><span class="ph-dot" :style="{ background: brand }" />Brand color <strong>{{ brand }}</strong></p>
    </div>
  </section>
  <section class="ph-section">
    <p class="ph-h">Inline</p>
    <p class="ph-note">{{ t('The same parts, laid out on the page without a trigger.') }}</p>
    <div class="ph-demo ph-inline">
      <ColorPicker v-model="inline" :alpha="false" aria-label="Inline color">
        <ColorPickerArea />
        <ColorPickerHue />
        <div class="ph-fields"><ColorPickerHexInput /><ColorPickerSwatch /></div>
      </ColorPicker>
    </div>
  </section>
</template>

<style scoped>
.ph-color { position: relative; }
.ph-brand { display: flex; align-items: center; gap: 10px; margin: 16px 0 0; color: var(--muted-foreground); font-size: 16px; line-height: 20px; }
.ph-brand strong { color: var(--foreground); font-weight: 400; }
.ph-dot { width: 16px; height: 16px; border-radius: 999px; transition: background-color 200ms; }
.ph-inline { display: flex; flex-direction: column; gap: 16px; }
.ph-inline :deep(.be-picker-area) { height: 160px; }
.ph-color :deep(.be-picker-socket)::before { border: 0; background: var(--ph-chip); }
.ph-fields { display: flex; gap: 6px; align-items: center; }
.ph-format { display: inline-flex; box-sizing: border-box; height: 36px; width: 48px; flex: none; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: 8px; color: var(--muted-foreground); font-size: 12px; line-height: 16px; font-weight: 500; }
</style>

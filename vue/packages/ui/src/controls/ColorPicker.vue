<script lang="ts">
export { colorPickerMessages, type ColorPickerMessages, type ColorPickerPresetValue } from './color-picker-context'
</script>

<script setup lang="ts">
import { computed, provide, shallowRef, useId, watch } from 'vue'
import ColorPickerAlpha from './ColorPickerAlpha.vue'
import ColorPickerArea from './ColorPickerArea.vue'
import ColorPickerChannels from './ColorPickerChannels.vue'
import ColorPickerContent from './ColorPickerContent.vue'
import ColorPickerEyeDropper from './ColorPickerEyeDropper.vue'
import ColorPickerHexInput from './ColorPickerHexInput.vue'
import ColorPickerHue from './ColorPickerHue.vue'
import ColorPickerPreset from './ColorPickerPreset.vue'
import ColorPickerPresets from './ColorPickerPresets.vue'
import ColorPickerSwatch from './ColorPickerSwatch.vue'
import ColorPickerTrigger from './ColorPickerTrigger.vue'
import { bound, parseColor, toHex, toRgb, type Hsva } from './colors'
import { colorPickerKey, colorPickerMessages, type ColorPickerMessages, type ColorPickerPresetValue } from './color-picker-context'

/**
 * Compose it from `ColorPickerTrigger` and `ColorPickerContent` (holding `ColorPickerArea`, `ColorPickerHue`,
 * `ColorPickerAlpha`, `ColorPickerSwatch`, `ColorPickerHexInput`, `ColorPickerChannels`, `ColorPickerEyeDropper`
 * and `ColorPickerPresets` with `ColorPickerPreset`), or omit the default slot for the ready-made picker.
 * Give it an `aria-label`.
 */
const props = withDefaults(defineProps<{
  /** Accessible name of the trigger and the panel in the ready-made picker. */
  label?: string
  /** Swatches of the ready-made picker. */
  presets?: readonly ColorPickerPresetValue[]
  disabled?: boolean
  /** Submits the hex value with a form under this name. */
  name?: string
  /** Starting color when `v-model` is not bound. */
  defaultValue?: string
  /** Allow transparency. When false the value is always opaque. */
  alpha?: boolean
  /** Starts open when `v-model:open` is not bound. */
  defaultOpen?: boolean
  /** Override any built-in string. */
  labels?: Partial<ColorPickerMessages>
}>(), { label: 'Color', presets: () => [], alpha: true, defaultValue: '#3478f6', defaultOpen: false })
const model = defineModel<string>()
const openModel = defineModel<boolean>('open')
// Uncontrolled until the parent binds v-model / v-model:open: the defaults seed them.
const value = computed(() => model.value ?? props.defaultValue)
const open = computed({ get: () => openModel.value ?? props.defaultOpen, set: next => { openModel.value = next } })
const emit = defineEmits<{
  /** Fires once an interaction settles: pointer release, key, preset or field commit. */
  commit: [value: string]
  /** Alias of `commit`, named like the upstream `onValueCommit`. */
  valueCommit: [value: string]
}>()
defineSlots<{
  /** Compose the picker from its parts. Omit it for the ready-made trigger and panel. */
  default?: () => unknown
}>()

const t = computed(() => ({ ...colorPickerMessages, ...props.labels }))
const id = `beui-color-picker-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
const triggerEl = shallowRef<HTMLButtonElement | null>(null)

const initial: Hsva = { hue: 220, saturation: 80, brightness: 96, alpha: 1 }
const channels = shallowRef<Hsva>(parseColor(value.value, initial) ?? initial)
// A controlled value the picker did not emit itself is re-read here, so the
// thumbs never paint a stale colour for a frame.
watch(value, next => {
  if (next === hex.value) return
  const parsed = parseColor(next, channels.value)
  if (parsed) channels.value = parsed
})
const hex = computed(() => toHex(props.alpha ? channels.value : { ...channels.value, alpha: 1 }))
const rgb = computed(() => toRgb(channels.value))

function update(next: Hsva) {
  const clean: Hsva = {
    hue: Math.min(360, Math.max(0, next.hue)),
    saturation: bound(next.saturation),
    brightness: bound(next.brightness),
    alpha: props.alpha ? bound(next.alpha, 1) : 1,
  }
  const nextHex = toHex(clean)
  const changed = nextHex !== hex.value
  channels.value = clean
  if (changed) model.value = nextHex
}
function commit() {
  emit('commit', hex.value)
  emit('valueCommit', hex.value)
}
function applyHex(input: string) {
  const parsed = parseColor(input, channels.value)
  if (!parsed) return false
  update(parsed)
  return true
}

provide(colorPickerKey, {
  id, t, channels, hex, rgb, alpha: computed(() => props.alpha), disabled: computed(() => props.disabled),
  update, commit, applyHex, open, triggerEl,
})

// --- Ready-made picker: the format switch ---------------------------------
const format = shallowRef<'hex' | 'rgb' | 'hsl'>('hex')
const FORMATS = ['hex', 'rgb', 'hsl'] as const
</script>

<template>
  <fieldset class="be-picker" :disabled="disabled">
    <input v-if="name" type="hidden" :name="name" :value="hex" :disabled="disabled">
    <slot v-if="$slots.default" />
    <template v-else>
      <ColorPickerTrigger :aria-label="label" />
      <ColorPickerContent :aria-label="label">
        <ColorPickerArea />
        <div class="be-picker-row">
          <ColorPickerEyeDropper />
          <div class="be-picker-sliders">
            <ColorPickerHue />
            <ColorPickerAlpha />
          </div>
        </div>
        <div class="be-picker-row be-picker-fields">
          <button
            type="button" class="be-picker-format" :aria-label="`${t.format}: ${format.toUpperCase()}`" :disabled="disabled"
            @click="format = FORMATS[(FORMATS.indexOf(format) + 1) % FORMATS.length]!">
            <Transition name="be-picker-format" mode="out-in">
              <span :key="format">{{ format.toUpperCase() }}</span>
            </Transition>
          </button>
          <ColorPickerHexInput v-if="format === 'hex'" />
          <ColorPickerChannels v-else :format="format" />
          <ColorPickerSwatch v-if="format === 'hex'" />
        </div>
        <ColorPickerPresets v-if="presets.length">
          <ColorPickerPreset v-for="preset in presets" :key="preset.value" :value="preset.value" :label="preset.label" />
        </ColorPickerPresets>
      </ColorPickerContent>
    </template>
  </fieldset>
</template>

<style>
.be-picker { position: relative; align-self: flex-start; display: flex; width: 100%; min-width: 0; max-width: 18rem; flex-direction: column; gap: .75rem; margin: 0; padding: 0; border: 0; }
/* Holding a trigger, the root is just the trigger's box, so the panel anchors under it even inside a stretching flex or grid parent. */
.be-picker:has(> [data-color-picker-trigger]) { width: fit-content; align-self: flex-start; }
.be-picker:disabled { opacity: .5; }
.be-picker-row { display: flex; align-items: center; gap: .75rem; }
.be-picker-sliders { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: .75rem; }
.be-picker-fields { align-items: flex-start; gap: .375rem; }
.be-picker-format { display: inline-flex; box-sizing: border-box; height: 2.25rem; width: 3rem; flex: none; align-items: center; justify-content: center; padding: 0; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; line-height: 1rem; font-weight: 500; outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1); }
.be-picker-format:hover { color: var(--beui-foreground); }
.be-picker-format:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-picker-format-enter-active, .be-picker-format-leave-active { transition: opacity .15s, transform .15s; }
.be-picker-format-enter-from { opacity: 0; transform: translateY(10px); }
.be-picker-format-leave-to { opacity: 0; transform: translateY(-10px); }
@media (prefers-reduced-motion: reduce) {
  .be-picker-format-enter-active, .be-picker-format-leave-active { transition: opacity .15s; }
  .be-picker-format-enter-from, .be-picker-format-leave-to { transform: none; }
}
</style>

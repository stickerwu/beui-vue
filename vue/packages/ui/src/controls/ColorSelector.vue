<script setup lang="ts">
import { arc, LayoutGroup, motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, useId } from 'vue'
import { layoutSpring, pressSpring } from '../core/motion'
import type { ChoiceOption } from './types'

// The selection ring hops to the next swatch over a low arc instead of
// sliding. arc() bends with distance (apex at half of strength x distance):
// ~6px to a neighbour, under 40px across a row of eight. Automatic direction
// puts a horizontal bulge below the row; a negative strength mirrors it above
// in both directions of travel.
const SELECTION_HOP = { ...layoutSpring, layout: { ...layoutSpring, path: arc({ strength: -0.2 }) } } as never

const props = withDefaults(defineProps<{
  options: readonly ChoiceOption[]
  label?: string
  /** The radio group name used in form submission. Generated when omitted. */
  name?: string
  disabled?: boolean
  required?: boolean
  form?: string
}>(), { label: 'Color', disabled: false, required: false })
const value = defineModel<string>()
const uid = useId()
const reduce = useReducedMotion()
const groupName = computed(() => props.name ?? uid)

function unavailable(option: ChoiceOption) {
  return props.disabled || Boolean(option.disabled)
}
function select(option: ChoiceOption) {
  if (option.value !== value.value) value.value = option.value
}
</script>

<template>
  <fieldset class="be-color-selector" :disabled="disabled" :form="form">
    <LayoutGroup :id="uid">
      <legend class="be-color-selector-label">{{ label }}</legend>
      <div class="be-color-selector-list">
        <motion.label
          v-for="option in options"
          :key="option.value"
          :tabindex="-1"
          class="be-color-selector-item"
          :data-unavailable="unavailable(option) || undefined"
          :while-tap="reduce || unavailable(option) ? undefined : { scale: 0.94 }"
          :transition="pressSpring"
        >
          <input
            class="be-color-selector-input"
            type="radio"
            :name="groupName"
            :value="option.value"
            :checked="value === option.value"
            :disabled="unavailable(option)"
            :required="required"
            :form="form"
            :aria-label="option.label"
            @change="select(option)"
          >
          <span class="be-color-selector-swatch" aria-hidden="true">
            <motion.span
              v-if="value === option.value"
              class="be-color-selector-ring"
              :layout-id="reduce ? undefined : 'color-selection'"
              :initial="false"
              :transition="SELECTION_HOP"
              :style="{ borderColor: `color-mix(in srgb, ${option.color ?? option.value} 65%, transparent)` }"
            />
            <span class="be-color-selector-dot" :style="{ backgroundColor: option.color ?? option.value }" />
          </span>
        </motion.label>
      </div>
    </LayoutGroup>
  </fieldset>
</template>

<style scoped>
.be-color-selector { min-width: 0; margin: 0; border: 0; padding: 0; }
.be-color-selector-label { margin-bottom: 0.75rem; padding: 0; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-muted-foreground); }
.be-color-selector-list { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; padding: 0.25rem; }
.be-color-selector-item { position: relative; display: inline-flex; flex-shrink: 0; border-radius: 9999px; cursor: pointer; }
.be-color-selector-item[data-unavailable] { cursor: not-allowed; opacity: 0.4; }
.be-color-selector-input { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.be-color-selector-swatch {
  position: relative; box-sizing: border-box; display: flex; width: 2.75rem; height: 2.75rem; align-items: center; justify-content: center;
  border-radius: 9999px; border: 1px solid color-mix(in srgb, var(--beui-foreground) 10%, transparent);
  background: color-mix(in srgb, var(--beui-muted) 60%, transparent);
}
.be-color-selector-input:focus-visible + .be-color-selector-swatch { outline: 2px solid var(--beui-foreground); outline-offset: 4px; }
.be-color-selector-ring { position: absolute; inset: -0.25rem; border-radius: 9999px; border: 2px solid; pointer-events: none; }
.be-color-selector-dot { box-sizing: border-box; width: 1.25rem; height: 1.25rem; border-radius: 9999px; border: 1px solid rgb(0 0 0 / 5%); }
</style>

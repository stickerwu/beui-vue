<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, useAttrs } from 'vue'
import { useReducedMotion } from '../core/reduced-motion'
import { pressSpring } from '../core/motion'
import { SELECTION_HOP, useColorSelector } from './color-selector-context'

const props = withDefaults(defineProps<{
  value: string
  /** Any CSS color, including a custom property. */
  color: string
  /** Accessible color name; selection never relies on color alone. */
  label: string
  disabled?: boolean
}>(), { disabled: false })

// `class` and `style` style the visible swatch; every other attribute lands on the radio input.
defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
const inputAttrs = computed(() => { const { class: _class, style: _style, ...rest } = attrs; return rest })
const context = useColorSelector()
const reduce = useReducedMotion()
const selected = () => context.value.value === props.value
const unavailable = () => props.disabled || context.disabled.value
</script>

<template>
  <motion.label
    :tabindex="-1"
    class="be-color-selector-item"
    :data-unavailable="unavailable() || undefined"
    :while-tap="reduce || unavailable() ? undefined : { scale: 0.94 }"
    :transition="pressSpring"
  >
    <input
      class="be-color-selector-input"
      type="radio"
      :name="context.name.value"
      :value="value"
      :checked="selected()"
      :disabled="unavailable()"
      :required="context.required.value"
      :form="context.form.value"
      :aria-label="label"
      v-bind="inputAttrs"
      @change="context.select(value)"
    >
    <span class="be-color-selector-swatch" :class="attrs.class" :style="attrs.style as never" aria-hidden="true">
      <motion.span
        v-if="selected()"
        class="be-color-selector-ring"
        :layout-id="reduce ? undefined : 'color-selection'"
        :initial="false"
        :transition="SELECTION_HOP"
        :style="{ borderColor: `color-mix(in srgb, ${color} 65%, transparent)` }"
      />
      <span class="be-color-selector-dot" :style="{ backgroundColor: color }" />
    </span>
  </motion.label>
</template>

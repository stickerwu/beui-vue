<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { useId } from 'vue'
import { tabsSpring } from '../core/motion'
import type { ChoiceOption } from './types'
const { options, label = 'Color', name, disabled = false } = defineProps<{ options: readonly ChoiceOption[]; label?: string; name?: string; disabled?: boolean }>()
const value = defineModel<string>()
const uid = useId()
const reduce = useReducedMotion()
</script>
<template><fieldset class="colors" :disabled="disabled"><legend>{{ label }}</legend><div class="list"><label v-for="option in options" :key="option.value" class="swatch" :style="{ '--color': option.color ?? option.value }">
  <input v-model="value" type="radio" :name="name ?? uid" :value="option.value" :aria-label="option.label" :disabled="option.disabled" /><span class="color" aria-hidden="true" />
  <motion.span v-if="value === option.value" class="outline" :layout-id="reduce ? undefined : uid" :transition="tabsSpring" />
</label></div></fieldset></template>
<style scoped>.colors { padding: 0; margin: 0; border: 0; min-width: 0; } legend { font-size: .85rem; margin-bottom: .75rem; font-weight: 500; } .list { display: flex; flex-wrap: wrap; gap: .5rem; } .swatch { position: relative; display: grid; place-items: center; width: 1.75rem; height: 1.75rem; cursor: pointer; } .swatch input { position: absolute; opacity: 0; inset: 0; width: 100%; height: 100%; margin: 0; } .color { width: 1.25rem; height: 1.25rem; background: var(--color); border-radius: 50%; } .outline { position: absolute; inset: 0; border: 2px solid var(--color); border-radius: 50%; pointer-events: none; } input:focus-visible + .color { outline: 2px solid var(--beui-ring); outline-offset: 5px; } input:disabled + .color { opacity: .5; }</style>

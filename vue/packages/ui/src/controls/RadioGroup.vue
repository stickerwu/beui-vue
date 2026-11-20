<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { useId } from 'vue'
import { pressSpring } from '../core/motion'
import type { ChoiceOption } from './types'
const { options, name, label = 'Options', disabled, required } = defineProps<{ options: readonly ChoiceOption[]; name?: string; label?: string; disabled?: boolean; required?: boolean }>()
const value = defineModel<string>()
const uid = useId()
const reduce = useReducedMotion()
</script>
<template><div class="radios" role="radiogroup" :aria-label="label"><label v-for="option in options" :key="option.value" class="row" :data-disabled="disabled || option.disabled">
  <input v-model="value" type="radio" :name="name ?? uid" :value="option.value" :required="required" :disabled="disabled || option.disabled" />
  <span class="ring" aria-hidden="true"><motion.span v-if="option.value === value" class="dot" :layout-id="reduce ? undefined : `${uid}-dot`" :transition="pressSpring" /></span>
  <slot name="label" :option="option">{{ option.label }}</slot>
</label></div></template>
<style scoped>.radios { display: grid; gap: .75rem; } .row { display: flex; align-items: center; gap: .625rem; position: relative; font-size: .875rem; cursor: pointer; } .row[data-disabled=true] { opacity: .5; cursor: default; } .row input { position: absolute; width: 18px; height: 18px; opacity: 0; margin: 0; } .ring { display: grid; place-items: center; width: 18px; height: 18px; border: 1px solid var(--beui-border); border-radius: 50%; } input:checked + .ring { border-color: var(--beui-primary); } input:focus-visible + .ring { outline: 2px solid var(--beui-ring); outline-offset: 3px; } .dot { width: 10px; height: 10px; background: var(--beui-primary); border-radius: 50%; } @media(forced-colors:active){ .dot { background: Highlight; forced-color-adjust: none; } }</style>

<script setup lang="ts">
import { motion, useReducedMotion } from 'motion-v'
import { useId } from 'vue'
import { pressSpring } from '../core/motion'
const { label, description, indeterminate = false, disabled = false, name, value = 'on', required = false } = defineProps<{
  label?: string; description?: string; indeterminate?: boolean; disabled?: boolean; name?: string; value?: string; required?: boolean
}>()
const uid = useId()
const checked = defineModel<boolean>({ default: false })
const reduce = useReducedMotion()
</script>
<template><label class="choice" :data-disabled="disabled"><input v-model="checked" class="native" type="checkbox" :value="value" :name="name" :required="required" :disabled="disabled" :indeterminate.prop="indeterminate" :aria-labelledby="description ? `${uid}-label` : undefined" :aria-describedby="description ? `${uid}-detail` : undefined" />
  <motion.span class="box" aria-hidden="true" :data-on="checked || indeterminate" :while-press="reduce || disabled ? undefined : { scale: .9 }" :transition="pressSpring">
    <svg viewBox="0 0 16 16"><path :d="indeterminate ? 'M4 8h8' : 'm3.2 8 3.1 3.3 6.5-6.8'" pathLength="1" :stroke-dashoffset="checked || indeterminate ? 0 : 1" /></svg>
  </motion.span><span v-if="label || $slots.default"><span :id="`${uid}-label`"><slot>{{ label }}</slot></span><small v-if="description" :id="`${uid}-detail`">{{ description }}</small></span></label></template>
<style scoped>
.choice small { display:block; color:var(--beui-muted-foreground); line-height:1.4; margin-top:.12rem; }
.choice { display: inline-flex; position: relative; align-items: center; gap: .625rem; font-size: .875rem; cursor: pointer; } .choice[data-disabled=true] { opacity: .5; cursor: default; }
.native { position: absolute; opacity: 0; width: 1.125rem; height: 1.125rem; margin: 0; } .box { display: grid; place-items: center; width: 1.125rem; height: 1.125rem; border-radius: .3rem; border: 1px solid var(--beui-border); background: var(--beui-background); }
.box[data-on=true] { background: var(--beui-primary); border-color: var(--beui-primary); color: var(--beui-primary-foreground); } .box svg { width: 90%; height: 90%; } .box path { stroke: currentColor; fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; stroke-dasharray: 1; transition: stroke-dashoffset .18s; }
.native:focus-visible + .box { outline: 2px solid var(--beui-ring); outline-offset: 3px; } @media (prefers-reduced-motion: reduce) { .box path { transition: none; } }
@media (forced-colors: active) { .box[data-on=true] { border-color: Highlight; color: Highlight; } }
</style>

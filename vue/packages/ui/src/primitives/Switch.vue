<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { shallowRef, useId } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ checked?: boolean, disabled?: boolean, label?: string, ariaLabel?: string, id?: string }>(), { checked: false })
const emit = defineEmits<{ 'update:checked': [checked: boolean], checkedChange: [checked: boolean] }>()
const id = useId()
const pressed = shallowRef(false)
const reduce = useReducedMotion()
const thumbSpring = { type: 'spring', stiffness: 800, damping: 80, mass: 4 } as const
function toggle() {
  if (props.disabled) return
  emit('update:checked', !props.checked)
  emit('checkedChange', !props.checked)
}
</script>

<template>
  <span class="be-switch-wrap" :class="$attrs.class" :style="$attrs.style as any">
    <button v-bind="{ ...$attrs, class: undefined, style: undefined }" :id="props.id || id" type="button" role="switch" class="be-switch" :disabled="disabled" :aria-checked="checked" :aria-label="ariaLabel" :data-state="checked ? 'checked' : 'unchecked'"
      @click="toggle" @pointerdown="pressed = true" @pointerup="pressed = false" @pointercancel="pressed = false" @pointerleave="pressed = false">
      <motion.span class="be-switch-thumb" :initial="false" :animate="{ x: checked ? 20 : 0, scale: pressed && !disabled && !reduce ? 0.9 : 1 }" :transition="reduce ? { duration: 0 } : thumbSpring" />
    </button>
    <label v-if="label" :for="props.id || id">{{ label }}</label>
  </span>
</template>

<style scoped>
.be-switch-wrap { display: inline-flex; align-items: center; gap: .75rem; color: var(--beui-foreground); font-size: .875rem; }
.be-switch-wrap label { cursor: pointer; }
.be-switch { display: inline-flex; box-sizing: border-box; align-items: center; flex: none; width: 48px; height: 28px; padding: 0 4px; border: 0; border-radius: 999px; background: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); cursor: pointer; transition: background-color .2s; }
.be-switch[data-state=checked] { background: var(--beui-primary); }
.be-switch:disabled { opacity: .6; cursor: not-allowed; }
.be-switch:focus-visible { outline: 2px solid var(--beui-ring); outline-offset: 2px; }
.be-switch-thumb { display: block; pointer-events: none; width: 20px; height: 20px; border-radius: 50%; background: var(--beui-background); box-shadow: 0 2px 5px #0003; }
</style>

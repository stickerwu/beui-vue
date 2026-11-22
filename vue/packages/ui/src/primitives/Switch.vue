<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { shallowRef, useId, useTemplateRef, watch } from 'vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ checked?: boolean, disabled?: boolean, label?: string, ariaLabel?: string, id?: string }>(), { checked: false })
const emit = defineEmits<{ 'update:checked': [checked: boolean], checkedChange: [checked: boolean] }>()
const id = useId()
const pressed = shallowRef(false)
const reduce = useReducedMotion()
const thumbSpring = { type: 'spring', stiffness: 800, damping: 80, mass: 4 } as const
// Disabled shake feedback when pressed: a short wobble that outlives the press,
// run on the independent `translate` property so it never fights the thumb's own travel.
const thumb = useTemplateRef<{ $el?: HTMLElement } | HTMLElement>('thumb')
watch(pressed, isPressed => {
  if (!isPressed || !props.disabled || reduce.value) return
  const raw = thumb.value
  const el = (raw && '$el' in raw ? raw.$el : raw) as HTMLElement | null | undefined
  el?.animate?.(
    // The easing belongs to each segment between two keyframes, as in Motion's keyframe arrays.
    [{ translate: '0px', easing: 'ease-out' }, { translate: '-2px', easing: 'ease-out' }, { translate: '2px', easing: 'ease-out' }, { translate: '-1px', easing: 'ease-out' }, { translate: '0px' }],
    { delay: 200, duration: 600 },
  )
})
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
      <motion.div ref="thumb" class="be-switch-thumb" :initial="false" :animate="{ x: checked ? 20 : 0, scale: pressed && !disabled && !reduce ? 0.9 : 1 }" :transition="reduce ? { duration: 0 } : thumbSpring">
        <!-- Stretch toward the destination while active. -->
        <div class="be-switch-stretch" :class="{ 'is-squish': pressed && !disabled && !reduce, 'is-checked': checked }" />
      </motion.div>
    </button>
    <label v-if="label" :for="props.id || id">{{ label }}</label>
  </span>
</template>

<style scoped>
.be-switch-wrap { display: inline-flex; align-items: center; gap: .75rem; }
.be-switch-wrap label { cursor: pointer; color: var(--beui-foreground); font-size: .875rem; line-height: 1.25rem; }
.be-switch { display: inline-flex; box-sizing: border-box; align-items: center; flex: none; width: 48px; height: 28px; padding: 0 4px; border: 0; border-radius: calc(infinity * 1px); background: color-mix(in srgb, var(--beui-muted-foreground) 60%, transparent); cursor: pointer; outline: none; transition: background-color .2s cubic-bezier(.4, 0, .2, 1); }
.be-switch[data-state=checked] { background: var(--beui-primary); }
.be-switch:disabled { opacity: .6; cursor: not-allowed; }
.be-switch:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-switch-thumb { display: block; pointer-events: none; width: 20px; height: 20px; border-radius: calc(infinity * 1px); background: var(--beui-background); box-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1); }
.be-switch-stretch { width: 20px; height: 20px; }
.be-switch-stretch.is-squish { margin-right: .25rem; }
.be-switch-stretch.is-squish.is-checked { margin-right: 0; margin-left: .25rem; }
</style>

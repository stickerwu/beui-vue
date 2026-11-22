<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from './core/reduced-motion'
import { shallowRef } from 'vue'
import { easeOut, pressSpring } from './core/motion'
import { useMountedMedia } from './core/mounted-media'

const { variant = 'primary', size = 'md', pressScale = 0.93, ripple = false, disabled = false, type = 'button', href, hover = true } = defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  pressScale?: number
  /** Set false to drop the hover lift (stateful buttons keep only the press). */
  hover?: boolean
  ripple?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  href?: string
}>()
const emit = defineEmits<{ click: [event: MouseEvent] }>()
const reduce = useReducedMotion()
// Hover lift is gated on a true hover device: touch fires a sticky phantom :hover on tap.
const canHover = useMountedMedia('(hover: hover) and (pointer: fine)')
const ripples = shallowRef<{ id: number; size: number; left: number; top: number }[]>([])
let seed = 0

function press(event: PointerEvent) {
  if (!ripple || disabled || reduce.value || event.button !== 0) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  ripples.value = [...ripples.value, { id: ++seed, size, left: event.clientX - rect.left - size / 2, top: event.clientY - rect.top - size / 2 }]
}

function activate(event: MouseEvent) {
  if (disabled) event.preventDefault()
  else emit('click', event)
}
</script>

<template>
  <component :is="href !== undefined ? motion.a : motion.button" class="be-button" :data-variant="variant" :data-size="size"
    :type="href === undefined ? type : undefined" :href="disabled ? undefined : href" :disabled="href === undefined ? disabled : undefined"
    :role="href !== undefined && disabled ? 'link' : undefined" :aria-disabled="href !== undefined && disabled || undefined"
    :while-press="!reduce && !disabled ? { scale: pressScale } : undefined" :while-hover="!reduce && hover && canHover && !disabled ? { scale: 1.02 } : undefined"
    :transition="pressSpring" @pointerdown="press" @click="activate">
    <span v-if="ripple" class="be-ripple-mask" aria-hidden="true">
      <motion.span v-for="drop in ripples" :key="drop.id" class="be-ripple"
        :style="{ left: `${drop.left}px`, top: `${drop.top}px`, width: `${drop.size}px`, height: `${drop.size}px` }"
        :initial="{ scale: 0.05, opacity: 0.3 }" :animate="{ scale: 1, opacity: 0 }" :transition="{ duration: 1.6, ease: easeOut }"
        @animation-complete="ripples = ripples.filter(item => item.id !== drop.id)" />
    </span>
    <slot />
  </component>
</template>

<style scoped>
.be-button { position: relative; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; flex: none; height: 2.5rem; gap: .5rem; padding: 0 1.25rem; border: 0 solid var(--beui-border); border-radius: 999px; font: inherit; font-size: .875rem; font-weight: 500; line-height: 1.25rem; text-decoration: none; user-select: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1), border-color .15s cubic-bezier(.4, 0, .2, 1); }
.be-button[data-variant=primary] { background: var(--beui-primary); color: var(--beui-primary-foreground); }
.be-button[data-variant=secondary] { background: var(--beui-card); color: var(--beui-foreground); border-width: 1px; }
.be-button[data-variant=outline] { background: transparent; color: var(--beui-foreground); border-width: 1px; }
.be-button[data-variant=ghost] { background: transparent; color: var(--beui-muted-foreground); }
.be-button[data-size=sm] { height: 2rem; padding: 0 .75rem; font-size: .75rem; line-height: 1rem; gap: .375rem; }
.be-button[data-size=lg] { height: 3rem; padding: 0 1.5rem; font-size: 1rem; line-height: 1.5rem; }
.be-button[data-size=icon] { height: 2rem; width: 2rem; padding: 0; border-radius: .5rem; }
.be-button:disabled, .be-button[aria-disabled=true] { opacity: .5; cursor: default; pointer-events: none; }
.be-ripple-mask { position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: inherit; }
.be-ripple { position: absolute; border-radius: 50%; background: currentColor; }
@media (hover: hover) { .be-button[data-variant=primary]:hover { background: color-mix(in oklab, var(--beui-primary) 90%, transparent); } .be-button:is([data-variant=ghost], [data-variant=outline]):hover { color: var(--beui-foreground); background: color-mix(in oklab, var(--beui-muted) 60%, transparent); } }
</style>

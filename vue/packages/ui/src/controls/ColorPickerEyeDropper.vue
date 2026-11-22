<script setup lang="ts">
import { motion } from 'motion-v'
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { pressSpring } from '../core/motion'
import { useReducedMotion } from '../core/reduced-motion'
import { useColorPickerContext } from './color-picker-context'

/** Samples a color from anywhere on screen. Renders nothing where the browser has no EyeDropper API. */
const context = useColorPickerContext('ColorPickerEyeDropper')
const reduce = useReducedMotion()
type Dropper = { open: (options?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }> }
const eye = shallowRef<new () => Dropper>()
let sampling: AbortController | undefined
onMounted(() => { eye.value = (window as Window & { EyeDropper?: new () => Dropper }).EyeDropper })
onBeforeUnmount(() => sampling?.abort())
async function sample() {
  if (!eye.value) return
  sampling?.abort()
  sampling = new AbortController()
  try {
    const result = await new eye.value().open({ signal: sampling.signal })
    if (context.applyHex(result.sRGBHex)) context.commit()
  } catch {
    // Dismissed with Escape.
  }
}
</script>

<template>
  <motion.button
    v-if="eye" type="button" class="be-picker-eye" :aria-label="context.t.value.eyeDropper" :disabled="context.disabled.value"
    :while-press="reduce || context.disabled.value ? undefined : { scale: 0.92 }" :transition="pressSpring" @click="sample">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
    </svg>
  </motion.button>
</template>

<style>
.be-picker-eye { display: inline-flex; width: 2.25rem; height: 2.25rem; flex: none; align-items: center; justify-content: center; padding: 0; border: 1px solid var(--beui-border); border-radius: .5rem; background: var(--beui-background); color: var(--beui-muted-foreground); outline: none; cursor: pointer; transition: color .15s; }
.be-picker-eye:hover { color: var(--beui-foreground); }
.be-picker-eye:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-picker-eye:disabled { cursor: not-allowed; }
.be-picker-eye svg { width: 1rem; height: 1rem; }
</style>

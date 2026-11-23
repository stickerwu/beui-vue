<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import { layoutSpring } from '../core/motion'
import { useReducedMotion } from '../core/reduced-motion'
import { MORPH, useColorPickerContext } from './color-picker-context'

/** Opens `ColorPickerContent`. Its color chip is the surface that grows into the area. */
defineSlots<{
  /** Replaces the hex label beside the chip. */
  default?: () => unknown
}>()

const context = useColorPickerContext('ColorPickerTrigger')
const reduce = useReducedMotion()
const labelBox = useTemplateRef<HTMLSpanElement>('labelBox')

// The hex beside the chip. Its width springs to the text instead of snapping,
// so the trigger never jumps when the hex gains or drops its alpha pair. Width
// is a layout property, but this is one small inline box with nothing laid out
// after it inside the button, and a transform cannot resize the border.
const labelWidth = shallowRef<number | null>(null)
let observer: ResizeObserver | undefined
onMounted(() => {
  const text = labelBox.value
  if (!text) return
  const measure = () => { labelWidth.value = text.offsetWidth }
  measure()
  observer = new ResizeObserver(measure)
  observer.observe(text)
})
onBeforeUnmount(() => observer?.disconnect())
const alphaSuffix = computed(() => context.hex.value.slice(7))
const labelTransition = computed(() => (reduce.value ? { duration: 0 } : layoutSpring))
const alphaEnter = computed(() => ({ opacity: 0, x: reduce.value ? 0 : -4, filter: reduce.value ? 'blur(0px)' : 'blur(3px)' }))
const alphaExit = computed(() => ({ opacity: 0, filter: reduce.value ? 'blur(0px)' : 'blur(3px)', transition: { duration: 0.12 } }))
function bindTrigger(node: unknown) { context.triggerEl.value = node instanceof HTMLButtonElement ? node : null }
</script>

<template>
  <button
    :ref="bindTrigger" type="button" class="be-picker-trigger" data-color-picker-trigger="" :disabled="context.disabled.value"
    aria-haspopup="dialog" :aria-expanded="context.open.value" :aria-controls="context.open.value ? `${context.id}-content` : undefined"
    @click="context.open.value = !context.open.value">
    <span class="be-picker-socket" aria-hidden="true">
      <motion.span v-if="!context.open.value" :layout-id="reduce ? undefined : `${context.id}-chip`" :transition="MORPH" class="be-picker-chip">
        <span class="be-picker-chip-fill" :style="{ backgroundColor: context.hex.value }" />
      </motion.span>
    </span>
    <slot>
      <motion.span class="be-picker-label" :initial="false" :animate="{ width: labelWidth === null ? 'auto' : labelWidth }" :transition="labelTransition">
        <span ref="labelBox" class="be-picker-label-text">
          {{ context.hex.value.slice(0, 7).toUpperCase() }}
          <!-- One constant key: only gaining or dropping the pair animates, not each new value. -->
          <AnimatePresence mode="popLayout" :initial="false">
            <motion.span
              v-if="alphaSuffix" key="alpha" class="be-picker-alpha"
              :initial="alphaEnter" :animate="{ opacity: 1, x: 0, filter: 'blur(0px)' }" :exit="alphaExit" :transition="layoutSpring">
              {{ alphaSuffix.toUpperCase() }}
            </motion.span>
          </AnimatePresence>
        </span>
      </motion.span>
    </slot>
  </button>
</template>

<style>
.be-picker-trigger { display: inline-flex; width: fit-content; align-self: flex-start; box-sizing: border-box; height: 2.5rem; align-items: center; gap: .625rem; padding: 0 .875rem 0 .625rem; border: 1px solid var(--beui-border); border-radius: .75rem; background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-size: .875rem; outline: none; cursor: pointer; transition: border-color .18s; }
.be-picker-trigger:hover { border-color: color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.be-picker-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.be-picker-trigger:disabled { cursor: not-allowed; }
.be-picker-socket { position: relative; width: 1.5rem; height: 1.5rem; flex: none; }
.be-picker-socket::before { content: ""; position: absolute; inset: 0; box-sizing: border-box; border: 1px dashed color-mix(in srgb, var(--beui-foreground) 20%, transparent); border-radius: .375rem; }
.be-picker-chip { position: absolute; inset: 0; overflow: hidden; border-radius: 6px; background: repeating-conic-gradient(#d4d4d8 0% 25%, #fafafa 0% 50%) 0 0 / 8px 8px; }
.be-picker-chip-fill { position: absolute; inset: 0; border-radius: 6px; box-shadow: inset 0 0 0 1px rgb(0 0 0 / .1); }
.be-picker-label { position: relative; display: inline-flex; overflow: hidden; line-height: 1.25rem; font-family: var(--font-mono, ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.be-picker-label-text { position: relative; display: inline-flex; flex: none; white-space: nowrap; }
.be-picker-alpha { color: var(--beui-muted-foreground); }
</style>

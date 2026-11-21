<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import { pressSpring } from '../core/motion'
import type { CardSize, CardVariant } from './state'

const props = withDefaults(defineProps<{ variant?: CardVariant, size?: CardSize, interactive?: boolean, selected?: boolean }>(), { variant: 'outlined', size: 'default' })
const reduce = useReducedMotion()
const pressed = shallowRef(false)
let listeners: AbortController | undefined
function release() {
  listeners?.abort()
  pressed.value = false
}
function press(event: PointerEvent) {
  if (!props.interactive || reduce.value || !event.isPrimary || event.button !== 0) return
  release()
  listeners = new AbortController()
  const options = { capture: true, signal: listeners.signal }
  window.addEventListener('pointerup', release, options)
  window.addEventListener('pointercancel', release, options)
  window.addEventListener('blur', release, options)
  pressed.value = true
}
watch(() => props.interactive, release)
onBeforeUnmount(release)
</script>

<template>
  <motion.div class="be-card" data-slot="card" :data-size="size" :data-variant="variant" :data-selected="selected || undefined" :data-interactive="interactive || undefined"
    :initial="false" :animate="interactive ? { scale: pressed && !reduce ? 0.985 : 1 } : undefined" :transition="pressSpring" @pointerdown="press"><slot /></motion.div>
</template>

<style>
.be-card { --be-card-inset: 1.5rem; box-sizing: border-box; position: relative; display: flex; flex-direction: column; gap: var(--be-card-inset); padding-block: var(--be-card-inset); color: var(--beui-foreground); border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); transition: border-color .2s, box-shadow .2s, background-color .2s; }
.be-card[data-size=compact] { --be-card-inset: 1rem; }
.be-card[data-variant=muted] { border-color: transparent; background: var(--beui-muted); }
.be-card[data-interactive] { cursor: pointer; }
@media (hover:hover) { .be-card[data-interactive]:hover { border-color: color-mix(in srgb, var(--beui-foreground) 12%, transparent); } }
.be-card[data-selected], .be-card[data-selected]:hover { border-color: var(--beui-primary); box-shadow: 0 0 0 1px var(--beui-primary); }
.be-card[data-interactive]:has(:focus-visible) { outline: 2px solid var(--beui-foreground); outline-offset: 2px; }
.be-card-header, .be-card-footer, .be-card-content { padding-inline: var(--be-card-inset, 1.5rem); }
.be-card-header { display: grid; grid-auto-rows: min-content; align-items: start; gap: .375rem; }
.be-card-header:has(.be-card-action) { grid-template-columns: 1fr auto; }
.be-card .be-card-title { margin: 0; padding: 0; border: 0; letter-spacing: normal; color: var(--beui-foreground); font-size: 15px; line-height: 1.375; font-weight: 600; }
.be-card .be-card-description { margin: 0; color: var(--beui-muted-foreground); font-size: .875rem; line-height: 1.625; }
.be-card-action { display: flex; grid-column: 2; grid-row: 1 / span 2; align-items: center; justify-self: end; }
.be-card-content { font-size: .875rem; }
.be-card-footer { display: flex; align-items: center; gap: .5rem; }
.be-card-target::after { position: absolute; inset: 0; content: ''; }
</style>

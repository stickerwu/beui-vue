<script setup lang="ts">
import { motion, useTransform } from 'motion-v'
import { computed } from 'vue'
import { useSelectContext } from './select-context'

const RADIUS = 12

defineSlots<{ default?: () => unknown }>()

const ctx = useSelectContext('SelectTrigger')
const isTop = computed(() => ctx.placement.value === 'top')
// The edge facing the panel flattens while the panel is attached to it and rounds back as the panel pulls away
// — the two pinch apart — on the same curve the panel moves on. The far edge stays rounded.
const nearRadius = useTransform(ctx.progress, [0, 0.2, 0.4, 1], [RADIUS, 0, 0, RADIUS])
const rotate = useTransform(ctx.progress, p => ctx.reduce.value ? (ctx.open.value ? 180 : 0) : Math.min(1, Math.max(0, p)) * 180)
const style = computed(() => {
  const near = ctx.reduce.value ? RADIUS : nearRadius
  return {
    borderTopLeftRadius: isTop.value ? near : RADIUS,
    borderTopRightRadius: isTop.value ? near : RADIUS,
    borderBottomLeftRadius: isTop.value ? RADIUS : near,
    borderBottomRightRadius: isTop.value ? RADIUS : near,
  }
})

function onKeyDown(event: KeyboardEvent) {
  if (!ctx.open.value && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.preventDefault()
    ctx.setOpen(true)
  }
}
</script>

<template>
  <motion.button
    :id="ctx.triggerId" type="button" class="be-select-trigger" :disabled="ctx.disabled.value" aria-haspopup="listbox"
    :aria-expanded="ctx.open.value" :aria-controls="ctx.listId" :style="style" @click="ctx.setOpen(!ctx.open.value)" @keydown="onKeyDown"
  >
    <slot />
    <motion.span aria-hidden="true" class="be-select-chevron" :style="{ rotate }">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
    </motion.span>
  </motion.button>
</template>

<style scoped>
.be-select-trigger { position: relative; z-index: 10; box-sizing: border-box; display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .5rem .75rem; border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); font: inherit; font-size: .875rem; line-height: 1.25rem; outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1), border-color .15s cubic-bezier(.4, 0, .2, 1); }
@media (hover: hover) { .be-select-trigger:hover { border-color: var(--beui-border-strong, color-mix(in srgb, var(--beui-foreground) 12%, transparent)); } }
.be-select-trigger:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.be-select-trigger:disabled { pointer-events: none; opacity: .5; cursor: default; }
.be-select-chevron { color: var(--beui-muted-foreground); }
.be-select-chevron svg { display: block; }
</style>

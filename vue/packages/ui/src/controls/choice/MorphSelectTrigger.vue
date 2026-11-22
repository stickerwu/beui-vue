<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { useMorphSelectContext } from './select-context'

defineOptions({ inheritAttrs: false })

// Shared-layout morph: trigger box grows into the panel and back, one surface.
const MORPH = { type: 'spring', duration: 0.5, bounce: 0.22 } as const
const INSTANT = { duration: 0 } as const

defineSlots<{ default?: () => unknown }>()

const ctx = useMorphSelectContext('MorphSelectTrigger')

function setTrigger(el: unknown) {
  ctx.triggerRef.value = (el as { $el?: HTMLElement } | null)?.$el ?? null
}
function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    ctx.setOpen(true)
  }
}
</script>

<template>
  <!-- invisible sizer reserves the closed height (the morph surface is absolute, so this keeps surrounding layout from shifting) -->
  <div aria-hidden="true" inert class="be-smorph-row be-smorph-sizer">
    <slot />
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
  </div>

  <AnimatePresence :initial="false" mode="popLayout">
    <motion.button
      v-if="!ctx.open.value" v-bind="$attrs" :id="ctx.triggerId" key="trigger" :ref="setTrigger" :layout-id="ctx.layoutId" type="button"
      class="be-smorph-row be-smorph-trigger" :disabled="ctx.disabled.value" aria-haspopup="listbox" :aria-expanded="ctx.open.value"
      :aria-controls="ctx.listId" :transition="ctx.reduce.value ? INSTANT : MORPH" :style="{ borderRadius: 12 }"
      @click="ctx.setOpen(true)" @keydown="onKeyDown"
    >
      <motion.span layout="position" class="be-smorph-text"><slot /></motion.span>
      <motion.span layout="position" class="be-smorph-chevron">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </motion.span>
    </motion.button>
  </AnimatePresence>
</template>

<style scoped>
.be-smorph-row { box-sizing: border-box; display: flex; width: 100%; align-items: center; justify-content: space-between; gap: .5rem; margin: 0; padding: .625rem .875rem; font: inherit; font-size: .875rem; line-height: 1.25rem; }
.be-smorph-sizer { visibility: hidden; border: 1px solid var(--beui-border); border-radius: .75rem; }
.be-smorph-trigger { position: absolute; inset-inline: 0; top: 0; z-index: 10; border: 1px solid var(--beui-border); background: var(--beui-background); color: var(--beui-foreground); outline: none; cursor: pointer; transition: color .15s cubic-bezier(.4, 0, .2, 1), background-color .15s cubic-bezier(.4, 0, .2, 1), border-color .15s cubic-bezier(.4, 0, .2, 1); }
@media (hover: hover) { .be-smorph-trigger:hover { border-color: var(--beui-border-strong, color-mix(in srgb, var(--beui-foreground) 12%, transparent)); } }
.be-smorph-trigger:focus-visible { box-shadow: 0 0 0 2px color-mix(in srgb, var(--beui-foreground) 20%, transparent); }
.be-smorph-trigger:disabled { pointer-events: none; opacity: .5; cursor: default; }
.be-smorph-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-smorph-chevron { color: var(--beui-muted-foreground); }
.be-smorph-chevron svg { display: block; }
</style>

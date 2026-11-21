<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '../core/reduced-motion'
import { computed, inject, useAttrs } from 'vue'
import { layoutSpring } from '../core/motion'
import { dockKey } from './dock-context'

defineOptions({ inheritAttrs: false })
defineProps<{
  /** Marks the item as the current one and slides the shared pill to it. */
  active?: boolean
}>()
const attrs = useAttrs()
const dock = inject(dockKey, null)
const reduce = useReducedMotion()
const size = computed(() => dock?.value.size ?? 44)
const pillId = computed(() => dock?.value.pillLayoutId ?? 'dock-pill')
// With a click handler the item is the button; otherwise its children carry their own link or button.
const interactive = computed(() => 'onClick' in attrs)
</script>

<template>
  <button v-if="interactive" v-bind="attrs" type="button" class="be-dock-item be-dock-button" :style="{ width: `${size}px`, height: `${size}px` }" :aria-pressed="active">
    <motion.span v-if="active" class="be-dock-pill" :layout-id="pillId" :transition="reduce ? { duration: 0 } : layoutSpring" />
    <slot />
  </button>
  <div v-else class="be-dock-item" :class="attrs.class" :style="{ width: `${size}px`, height: `${size}px` }">
    <motion.span v-if="active" class="be-dock-pill" :layout-id="pillId" :transition="reduce ? { duration: 0 } : layoutSpring" />
    <slot />
  </div>
</template>

<style scoped>
.be-dock-item { position: relative; isolation: isolate; display: flex; flex-shrink: 0; align-items: center; justify-content: center; box-sizing: border-box; border-radius: 9999px; color: var(--beui-foreground); }
.be-dock-button { padding: 0; border: 0; background: transparent; cursor: pointer; outline: none; font: inherit; }
.be-dock-button:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }
.be-dock-pill { position: absolute; inset: .125rem; z-index: -1; border-radius: .75rem; background: color-mix(in srgb, var(--beui-muted) 60%, transparent); }
</style>

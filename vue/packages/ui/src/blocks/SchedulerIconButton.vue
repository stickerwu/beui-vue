<script setup lang="ts">
import { motion } from 'motion-v'
import { pressSpring } from '../core/motion'

defineOptions({ inheritAttrs: false })
defineProps<{ label: string; disabled?: boolean; expanded?: boolean; reduce: boolean }>()
</script>

<template>
  <motion.button
    v-bind="$attrs"
    type="button"
    class="sch-icon-button"
    :aria-label="label"
    :aria-expanded="expanded"
    :disabled="disabled"
    :while-press="reduce || disabled ? undefined : { scale: 0.86 }"
    :transition="pressSpring">
    <slot />
  </motion.button>
</template>

<style scoped>
.sch-icon-button { display: inline-flex; box-sizing: border-box; width: 2rem; height: 2rem; flex: none; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; cursor: pointer; outline: none; transition: color .15s, background-color .15s; }
.sch-icon-button:hover { background: var(--beui-muted); color: var(--beui-foreground); }
.sch-icon-button:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }
.sch-icon-button:disabled { pointer-events: none; opacity: .4; }
.sch-icon-button :deep(svg) { width: 1rem; height: 1rem; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
</style>

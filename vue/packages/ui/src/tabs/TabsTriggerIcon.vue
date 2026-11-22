<script setup lang="ts">
import { motion } from 'motion-v'
import { swapSpring } from '../core/motion'
import { ICON_GAP, useTabs } from './context'

// A trigger's icon before its label. Shown on every tab, or with
// `icons="selected"` springing open on the selected tab only.
defineProps<{ active: boolean }>()
defineSlots<{ default?: () => unknown }>()
const ctx = useTabs('TabsTrigger')
</script>

<template>
  <span v-if="ctx.icons.value === 'always'" aria-hidden="true" class="be-icon be-icon-always"><slot /></span>
  <motion.span
    v-else
    aria-hidden="true"
    data-tabs-icon=""
    class="be-icon be-icon-selected"
    :initial="false"
    :animate="{ width: active ? 'auto' : 0, marginRight: active ? ICON_GAP : 0, opacity: active ? 1 : 0, scale: active ? 1 : 0.6 }"
    :transition="ctx.reduce.value ? { duration: 0 } : swapSpring"
  ><slot /></motion.span>
</template>

<style scoped>
.be-icon { display: inline-flex; flex: none; align-items: center; }
.be-icon-always { margin-right: .375rem; }
.be-icon-selected { justify-content: center; overflow: hidden; }
</style>

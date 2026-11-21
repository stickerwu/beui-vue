<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { SUBMENU_VARIANTS, useAnimatedSidebar, useAnimatedSidebarPanel } from './context'

defineProps<{ open: boolean }>()
const { reduce } = useAnimatedSidebar()
const { collapsed } = useAnimatedSidebarPanel()
</script>

<template>
  <AnimatePresence :initial="false" mode="popLayout">
    <motion.ul
      v-if="open && !collapsed" key="sidebar-submenu" data-slot="sidebar-menu-sub" class="be-asb-sub"
      :variants="reduce ? undefined : SUBMENU_VARIANTS" :initial="reduce ? false : 'closed'" :animate="reduce ? { opacity: 1 } : 'open'"
      :exit="reduce ? { opacity: 0 } : 'closed'" :transition="reduce ? { duration: 0.12 } : undefined"
    >
      <slot />
    </motion.ul>
  </AnimatePresence>
</template>

<style>
:where(.be-asb-sub) {
  position: relative; display: flex; flex-direction: column; gap: .125rem; min-width: 0; margin: .25rem 0 0 1.25rem;
  padding: 0 0 0 .75rem; border-left: 1px solid var(--beui-border); list-style: none;
}
</style>

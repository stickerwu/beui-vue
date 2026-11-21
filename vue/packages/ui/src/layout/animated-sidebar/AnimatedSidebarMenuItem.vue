<script setup lang="ts">
import { AnimatePresence, motion, useMotionValue } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, useId, useTemplateRef } from 'vue'
import { layoutSpring } from '../../core/motion'
import { MENU_PILL_REDUCED_VARIANTS, MENU_PILL_VARIANTS, sidebarMenuKey, useSidebarMenu } from './context'

const menu = useSidebarMenu()
const key = useId()
const hasActive = computed(() => (menu?.activeKey.value ?? null) !== null)
const isActive = computed(() => menu?.activeKey.value === key)
const item = useTemplateRef<unknown>('item')
const y = useMotionValue(0)
let unregister: (() => void) | undefined
onMounted(() => {
  unregister = menu?.register({
    element: () => {
      const node = item.value as { $el?: unknown } | HTMLElement | null
      const element = node && '$el' in node ? node.$el : node
      return element instanceof HTMLElement ? element : null
    },
    y,
  })
})
onBeforeUnmount(() => unregister?.())
</script>

<template>
  <motion.li ref="item" :style="{ y }" data-slot="sidebar-menu-item" class="be-asb-item" @mouseenter="menu?.enter(key)" @focusin="menu?.focusKey(key)">
    <AnimatePresence :custom="hasActive">
      <motion.div
        v-if="hasActive" key="pill" class="be-asb-pill-track" :variants="menu?.reduce.value ? MENU_PILL_REDUCED_VARIANTS : MENU_PILL_VARIANTS"
        initial="initial" animate="animate" exit="exit" :custom="hasActive"
      >
        <motion.div v-if="isActive" :layout-id="`shared-bg-${menu?.uid}`" :transition="menu?.reduce.value ? { duration: 0 } : layoutSpring" class="be-asb-pill" />
      </motion.div>
    </AnimatePresence>
    <div class="be-asb-item-content"><slot /></div>
  </motion.li>
</template>

<style>
:where(.be-asb-item) { position: relative; }
.be-asb-pill-track { pointer-events: none; position: absolute; top: 0; left: 0; right: 0; height: 2.25rem; }
.be-asb-pill { pointer-events: none; width: 100%; height: 100%; border-radius: .75rem; background: color-mix(in srgb, var(--beui-muted) 70%, transparent); }
.be-asb-item-content { position: relative; z-index: 10; }
</style>

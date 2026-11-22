<script setup lang="ts">
import { motion } from 'motion-v'
import { computed, provide } from 'vue'
import {
  animatedSidebarPanelKey,
  PANEL_TRANSITION,
  REDUCED_TRANSITION,
  SIDEBAR_MORPH_TRANSITION,
  useAnimatedSidebar,
  type SidebarCollapsible,
  type SidebarSide,
  type SidebarVariant,
} from './context'
import MobileSidebar from './MobileSidebar.vue'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  side?: SidebarSide
  variant?: SidebarVariant
  collapsible?: SidebarCollapsible
  /** Accessible name of the sidebar. */
  ariaLabel?: string
  /** Class for the sticky surface inside the width-animated wrapper. */
  panelClassName?: string
  /** Alias of `panelClassName`. */
  panelClass?: string
}>(), { side: 'left', variant: 'sidebar', collapsible: 'icon' })
defineSlots<{ default?: () => unknown }>()

const { isMobile, open, reduce, t } = useAnimatedSidebar()
const label = computed(() => props.ariaLabel ?? t.value.label)
const collapsed = computed(() => props.collapsible !== 'none' && !open.value)
const offcanvas = computed(() => collapsed.value && props.collapsible === 'offcanvas')
const width = computed(() => (offcanvas.value ? '0px' : collapsed.value ? 'var(--sidebar-width-icon)' : 'var(--sidebar-width)'))
const offscreen = computed(() => (props.side === 'left' ? '-100%' : '100%'))

provide(animatedSidebarPanelKey, {
  collapsed,
  collapsible: computed(() => props.collapsible),
  side: computed(() => props.side),
})
</script>

<template>
  <MobileSidebar v-if="isMobile" :label="label" :side="side" :class="$attrs.class as string | undefined">
    <slot />
  </MobileSidebar>
  <motion.aside
    v-else v-bind="$attrs" :initial="false" :aria-label="label" data-slot="sidebar" class="be-asb"
    :class="{ 'be-asb-right': side === 'right' }"
    :data-state="collapsed ? 'collapsed' : 'expanded'" :data-collapsible="collapsible" :data-variant="variant" :data-side="side"
    :animate="{ width }" :transition="reduce ? { duration: 0 } : SIDEBAR_MORPH_TRANSITION"
  >
    <motion.div
      :initial="false" class="be-asb-surface" :class="[`be-asb-v-${variant}`, `be-asb-v-${variant}-${side}`, { 'be-asb-offcanvas': collapsible === 'offcanvas' }, panelClassName ?? panelClass]"
      :animate="{ opacity: offcanvas ? 0 : 1, x: offcanvas ? offscreen : '0%' }"
      :transition="reduce ? REDUCED_TRANSITION : PANEL_TRANSITION"
    >
      <slot />
    </motion.div>
  </motion.aside>
</template>

<style>
.be-asb { position: relative; display: none; flex-shrink: 0; height: auto; will-change: width; }
.be-asb-right { order: 9999; }
@media (min-width: 768px) { .be-asb { display: block; } }
.be-asb-surface {
  position: sticky; top: 0; display: flex; flex-direction: column; box-sizing: border-box; width: 100%; height: 100svh;
  overflow: hidden; background: var(--beui-background);
}
.be-asb-offcanvas { width: var(--sidebar-width); }
.be-asb-v-sidebar-left { border-right: 1px solid var(--beui-border); }
.be-asb-v-sidebar-right { border-left: 1px solid var(--beui-border); }
.be-asb-v-floating { height: calc(100svh - 1rem); margin: .5rem; border: 1px solid var(--beui-border); border-radius: 1rem; box-shadow: 0 1px 2px 0 rgb(0 0 0 / .05); }
.be-asb-v-inset { height: calc(100svh - 1rem); margin: .5rem; border-radius: 1rem; }
</style>

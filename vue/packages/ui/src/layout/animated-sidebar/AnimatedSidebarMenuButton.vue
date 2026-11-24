<script setup lang="ts">
import { motion } from 'motion-v'
import { useSlots, type VNode } from 'vue'
import { layoutSpring, pressSpring } from '../../core/motion'
import {
  LABEL_ENTER_TRANSITION,
  LABEL_EXIT_TRANSITION,
  REDUCED_TRANSITION,
  useAnimatedSidebar,
  useAnimatedSidebarPanel,
  type SidebarLinkTarget,
} from './context'

const props = withDefaults(defineProps<{
  href?: string
  isActive?: boolean
  /** Makes the row a disclosure button: the chevron shows and turns with this state. */
  ariaExpanded?: boolean
  disabled?: boolean
  closeOnSelect?: boolean
  target?: SidebarLinkTarget
  rel?: string
  /** Trailing text, for example a count. Hidden in the icon rail. */
  badge?: string
  /** Accessible name and tooltip in the icon rail when the label is not plain text. */
  label?: string
}>(), { isActive: false, ariaExpanded: undefined, disabled: false, closeOnSelect: undefined })
const emit = defineEmits<{ select: [] }>()
defineSlots<{
  /** Label of the row. */
  default?: () => VNode[]
  /** Icon before the label. Stays visible in the icon rail. */
  icon?: () => VNode[]
  /** Trailing content such as a count; replaces `badge`. Hidden in the icon rail. */
  badge?: () => VNode[]
}>()
const slots = useSlots()
const context = useAnimatedSidebar()
const panel = useAnimatedSidebarPanel()

function textLabel() {
  if (props.label) return props.label
  const nodes: VNode[] = slots.default?.() ?? []
  return nodes.map(node => (typeof node.children === 'string' ? node.children : '')).join('').trim() || undefined
}
function select(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  emit('select')
  const shouldCloseOnSelect = props.closeOnSelect ?? props.ariaExpanded === undefined
  if (context.isMobile.value && shouldCloseOnSelect) context.setOpenMobile(false)
  // A submenu cannot render in the icon rail, so opening one from there leaves
  // its children unreachable: a pointer can still fall back to the rail or the
  // shortcut, a finger has nothing. Selecting a group unfolds the panel that is
  // about to hold it.
  if (props.ariaExpanded !== undefined && panel.collapsed.value && !context.isMobile.value) context.setOpen(true)
}
</script>

<template>
  <component
    :is="href ? motion.a : motion.button" :href="href" :type="href ? undefined : 'button'" :disabled="href ? undefined : disabled"
    :target="href ? target : undefined" :rel="href ? (rel ?? (target === '_blank' ? 'noreferrer noopener' : undefined)) : undefined"
    :aria-current="isActive ? 'page' : undefined" :aria-expanded="ariaExpanded" :aria-disabled="href && disabled ? true : undefined"
    :aria-label="panel.collapsed.value ? textLabel() : undefined" :title="panel.collapsed.value ? textLabel() : undefined"
    :tabindex="href && disabled ? -1 : undefined" class="be-asb-button" :class="{ 'be-asb-button-active': isActive, 'be-asb-button-disabled': disabled }"
    :while-press="context.reduce.value || disabled ? undefined : { scale: 0.98 }" :transition="pressSpring" @click="select"
  >
    <motion.span v-if="isActive" :layout-id="context.layoutId" :transition="context.reduce.value ? { duration: 0 } : layoutSpring" class="be-asb-active-bg" />
    <span v-if="$slots.icon" aria-hidden="true" class="be-asb-icon"><slot name="icon" /></span>
    <motion.span
      :initial="false" :animate="{ opacity: panel.collapsed.value ? 0 : 1, x: panel.collapsed.value ? -4 : 0 }"
      :transition="context.reduce.value ? REDUCED_TRANSITION : panel.collapsed.value ? LABEL_EXIT_TRANSITION : LABEL_ENTER_TRANSITION"
      :aria-hidden="panel.collapsed.value" class="be-asb-label" :class="{ 'be-asb-label-collapsed': panel.collapsed.value }"
    >
      <slot />
    </motion.span>
    <span v-if="(badge || $slots.badge) && !panel.collapsed.value" class="be-asb-badge"><slot name="badge">{{ badge }}</slot></span>
    <motion.span
      v-if="ariaExpanded !== undefined" aria-hidden="true" :initial="false"
      :animate="{ opacity: panel.collapsed.value ? 0 : 1, rotate: ariaExpanded ? 90 : 0, x: panel.collapsed.value ? 4 : 0 }"
      :transition="context.reduce.value ? { duration: 0 } : layoutSpring" class="be-asb-chevron"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
    </motion.span>
  </component>
</template>

<style scoped>
.be-asb-button {
  position: relative; display: flex; align-items: center; gap: .625rem; box-sizing: border-box; width: 100%; min-width: 0; min-height: 2.25rem;
  margin: 0; padding: 0 .75rem; overflow: hidden; border: 0; border-radius: .75rem; background: transparent; color: var(--beui-muted-foreground);
  font: inherit; font-size: .875rem; line-height: 1.25rem; font-weight: 500; text-align: left; text-decoration: none; cursor: pointer; outline: none;
  transition: color .15s;
}
.be-asb-button:hover { color: var(--beui-foreground); }
.be-asb-button:focus-visible { background: color-mix(in srgb, var(--beui-muted) 70%, transparent); box-shadow: 0 0 0 2px var(--beui-ring); }
.be-asb-button-active { color: var(--beui-foreground); }
.be-asb-button-disabled { cursor: not-allowed; opacity: .4; }
.be-asb-active-bg { position: absolute; inset: 0; border-radius: .75rem; background: var(--beui-muted); }
.be-asb-icon { position: relative; z-index: 10; display: grid; flex-shrink: 0; place-items: center; width: 1.25rem; height: 1.25rem; }
.be-asb-label { position: relative; z-index: 10; flex: 1 1 0%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.be-asb-label-collapsed { pointer-events: none; }
.be-asb-badge { position: relative; z-index: 10; flex-shrink: 0; color: var(--beui-muted-foreground); font-size: .75rem; line-height: 1rem; }
.be-asb-chevron { position: relative; z-index: 10; display: grid; flex-shrink: 0; place-items: center; width: 1rem; height: 1rem; color: var(--beui-muted-foreground); }
</style>

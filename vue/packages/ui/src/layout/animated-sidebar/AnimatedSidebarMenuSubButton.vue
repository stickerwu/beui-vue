<script setup lang="ts">
import { motion } from 'motion-v'
import { pressSpring } from '../../core/motion'
import { useAnimatedSidebar, type SidebarLinkTarget } from './context'

const props = withDefaults(defineProps<{
  href?: string
  isActive?: boolean
  disabled?: boolean
  closeOnSelect?: boolean
  target?: SidebarLinkTarget
  rel?: string
}>(), { isActive: false, disabled: false, closeOnSelect: true })
const emit = defineEmits<{ select: [] }>()
const context = useAnimatedSidebar()

function select(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault()
    return
  }
  emit('select')
  if (context.isMobile.value && props.closeOnSelect) context.setOpenMobile(false)
}
</script>

<template>
  <component
    :is="href ? motion.a : motion.button" :href="href" :type="href ? undefined : 'button'" :disabled="href ? undefined : disabled"
    :target="href ? target : undefined" :rel="href ? (rel ?? (target === '_blank' ? 'noreferrer noopener' : undefined)) : undefined"
    :aria-current="isActive ? 'page' : undefined" :aria-disabled="href && disabled ? true : undefined" :tabindex="href && disabled ? -1 : undefined"
    class="be-asb-sub-button" :class="{ 'be-asb-sub-button-active': isActive, 'be-asb-sub-button-disabled': disabled }"
    :while-tap="context.reduce.value || disabled ? undefined : { scale: 0.98 }" :transition="pressSpring" @click="select"
  >
    <span aria-hidden="true" class="be-asb-sub-icon"><slot name="icon"><span class="be-asb-sub-dot" /></slot></span>
    <span class="be-asb-sub-label"><slot /></span>
  </component>
</template>

<style scoped>
.be-asb-sub-button {
  display: flex; align-items: center; gap: .5rem; box-sizing: border-box; width: 100%; min-width: 0; min-height: 2rem; margin: 0; padding: 0 .5rem;
  border: 0; border-radius: .5rem; background: transparent; color: var(--beui-muted-foreground); font: inherit; font-size: .75rem; line-height: 1rem;
  text-align: left; text-decoration: none; cursor: pointer; outline: none; transition: color .15s, background-color .15s;
}
.be-asb-sub-button:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); color: var(--beui-foreground); }
.be-asb-sub-button:focus-visible { background: color-mix(in srgb, var(--beui-muted) 70%, transparent); box-shadow: 0 0 0 2px var(--beui-ring); }
.be-asb-sub-button-active { background: color-mix(in srgb, var(--beui-muted) 70%, transparent); color: var(--beui-foreground); }
.be-asb-sub-button-disabled { cursor: not-allowed; opacity: .4; }
.be-asb-sub-icon { display: grid; flex-shrink: 0; place-items: center; width: 1rem; height: 1rem; }
.be-asb-sub-dot { width: .25rem; height: .25rem; border-radius: 999px; background: currentColor; }
.be-asb-sub-label { flex: 1 1 0%; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>

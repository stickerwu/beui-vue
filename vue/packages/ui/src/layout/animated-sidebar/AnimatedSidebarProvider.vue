<script setup lang="ts">
import { provide } from 'vue'
import { useMountedMedia } from '../../core/mounted-media'
import {
  animatedSidebarKey,
  MOBILE_QUERY,
  useSidebarSession,
  type AnimatedSidebarMessages,
} from './context'

const props = withDefaults(defineProps<{
  /** Desktop open state. Leave unset for an uncontrolled sidebar. */
  open?: boolean
  defaultOpen?: boolean
  /** Mobile sheet open state. Leave unset for an uncontrolled sheet. */
  openMobile?: boolean
  defaultOpenMobile?: boolean
  /** Ctrl/Cmd+B toggles the sidebar. Default true. */
  shortcut?: boolean
  /** Override any built-in string. */
  labels?: Partial<AnimatedSidebarMessages>
}>(), { open: undefined, defaultOpen: true, openMobile: undefined, defaultOpenMobile: false, shortcut: true })
const emit = defineEmits<{
  'update:open': [open: boolean]
  'update:openMobile': [open: boolean]
  openChange: [open: boolean]
  openMobileChange: [open: boolean]
}>()

// The breakpoint is read once mounted: the server cannot know it.
const isMobile = useMountedMedia(MOBILE_QUERY)
const session = useSidebarSession({
  open: () => props.open,
  defaultOpen: () => props.defaultOpen,
  openMobile: () => props.openMobile,
  defaultOpenMobile: () => props.defaultOpenMobile,
  onOpenChange: value => { emit('update:open', value); emit('openChange', value) },
  onOpenMobileChange: value => { emit('update:openMobile', value); emit('openMobileChange', value) },
  shortcut: () => props.shortcut,
  labels: () => props.labels,
}, isMobile)
provide(animatedSidebarKey, session)
</script>

<template>
  <div data-slot="sidebar-wrapper" class="be-asb-wrapper" :data-state="session.state.value">
    <slot />
  </div>
</template>

<style>
:where(.be-asb-wrapper) {
  --sidebar-width: 16rem;
  --sidebar-width-icon: 4.25rem;
  --sidebar-width-mobile: 18rem;
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 100svh;
  box-sizing: border-box;
  color: var(--beui-foreground);
  text-align: start;
}
</style>

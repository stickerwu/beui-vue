<script setup lang="ts">
import AnimatedSidebarInset from '../layout/animated-sidebar/AnimatedSidebarInset.vue'
import AnimatedSidebarPanel from '../layout/animated-sidebar/AnimatedSidebarPanel.vue'
import AnimatedSidebarProvider from '../layout/animated-sidebar/AnimatedSidebarProvider.vue'
import type { AnimatedSidebarMessages } from '../layout/animated-sidebar/context'
import ChatAppBody from './ChatAppBody.vue'

/**
 * The shell of a chat app: an AnimatedSidebar provider that folds the sidebar
 * away while the shell is too narrow to carry both panes. Compose it with the
 * `AnimatedSidebar*` parts, or fill the `sidebar` slot for the simple form.
 */
const props = withDefaults(defineProps<{
  /** Sidebar open state. Leave unset for an uncontrolled sidebar. */
  open?: boolean
  defaultOpen?: boolean
  openMobile?: boolean
  defaultOpenMobile?: boolean
  /** Ctrl/Cmd+B toggles the sidebar. Default true. */
  shortcut?: boolean
  /** Docked sidebar width as a CSS length. Default `17rem`. */
  sidebarWidth?: string
  /** Shell width in px under which the sidebar folds off-canvas. Ignored while `open` is controlled. */
  collapseSidebarBelow?: number
  labels?: Partial<AnimatedSidebarMessages>
}>(), { open: undefined, defaultOpen: true, openMobile: undefined, defaultOpenMobile: false, shortcut: true, sidebarWidth: '17rem', collapseSidebarBelow: 600 })
const emit = defineEmits<{
  'update:open': [value: boolean]
  openChange: [value: boolean]
  'update:openMobile': [value: boolean]
  openMobileChange: [value: boolean]
}>()
</script>

<template>
  <AnimatedSidebarProvider
    class="be-chat-app" :style="{ '--sidebar-width': sidebarWidth }" :open="open" :default-open="defaultOpen" :open-mobile="openMobile" :default-open-mobile="defaultOpenMobile"
    :shortcut="shortcut" :labels="labels" @update:open="emit('update:open', $event)" @open-change="emit('openChange', $event)"
    @update:open-mobile="emit('update:openMobile', $event)" @open-mobile-change="emit('openMobileChange', $event)"
  >
    <ChatAppBody :fit="open === undefined" :min-width="collapseSidebarBelow">
      <template #default="scope">
        <template v-if="$slots.sidebar">
          <AnimatedSidebarPanel collapsible="offcanvas" class="be-chat-aside" panel-class="be-chat-aside-surface"><div class="be-chat-aside-body"><slot name="sidebar" v-bind="scope" /></div></AnimatedSidebarPanel>
          <AnimatedSidebarInset class="be-chat-inset"><slot v-bind="scope" /></AnimatedSidebarInset>
        </template>
        <slot v-else v-bind="scope" />
      </template>
    </ChatAppBody>
  </AnimatedSidebarProvider>
</template>

<style>
.be-chat-app { box-sizing: border-box; min-height: 0; width: 100%; overflow: hidden; border: 1px solid var(--beui-border); border-radius: 1rem; background: var(--beui-background); }
.be-chat-app .be-chat-aside { min-height: 0; }
.be-chat-app .be-chat-aside-surface { height: 100%; }
.be-chat-app .be-chat-aside-body { min-height: 0; flex: 1 1 0%; overflow: auto; padding: .75rem; }
.be-chat-app .be-chat-inset { min-height: 0; }
</style>

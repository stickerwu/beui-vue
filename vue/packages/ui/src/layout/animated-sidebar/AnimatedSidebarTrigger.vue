<script setup lang="ts">
import { computed } from 'vue'
import { useAnimatedSidebar } from './context'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ ariaLabel?: string }>()
const emit = defineEmits<{ click: [event: MouseEvent] }>()
const { isMobile, open, openMobile, t, toggleSidebar, triggerRef } = useAnimatedSidebar()
const expanded = computed(() => (isMobile.value ? openMobile.value : open.value))

function setRef(node: unknown) {
  triggerRef.value = node instanceof HTMLButtonElement ? node : null
}
function onClick(event: MouseEvent) {
  emit('click', event)
  if (!event.defaultPrevented) toggleSidebar()
}
</script>

<template>
  <button
    v-bind="$attrs" :ref="setRef" type="button" class="be-asb-trigger" data-slot="sidebar-trigger"
    :aria-label="props.ariaLabel ?? t.toggle" :aria-expanded="expanded"
    :data-state="expanded ? 'expanded' : 'collapsed'" @click="onClick"
  >
    <slot />
  </button>
</template>

<style>
:where(.be-asb-trigger) {
  display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center;
  width: 2.5rem; height: 2.5rem; padding: 0; margin: 0; border: 0; border-radius: .75rem;
  background: transparent; color: inherit; font: inherit; cursor: pointer; outline: none;
}
.be-asb-trigger, .be-asb-trigger:focus-visible { outline: none; }
.be-asb-trigger:focus-visible { box-shadow: 0 0 0 2px var(--beui-background), 0 0 0 4px var(--beui-ring); }</style>

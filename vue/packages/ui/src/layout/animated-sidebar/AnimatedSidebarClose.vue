<script setup lang="ts">
import { useAnimatedSidebar } from './context'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ ariaLabel?: string }>()
const emit = defineEmits<{ click: [event: MouseEvent] }>()
const { isMobile, setOpen, setOpenMobile, t } = useAnimatedSidebar()

function onClick(event: MouseEvent) {
  emit('click', event)
  if (event.defaultPrevented) return
  if (isMobile.value) setOpenMobile(false)
  else setOpen(false)
}
</script>

<template>
  <button v-bind="$attrs" type="button" class="be-asb-close" :aria-label="props.ariaLabel ?? t.close" @click="onClick">
    <slot />
  </button>
</template>

<style>
:where(.be-asb-close) {
  display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center;
  width: 2.5rem; height: 2.5rem; padding: 0; margin: 0; border: 0; border-radius: .75rem;
  background: transparent; color: inherit; font: inherit; cursor: pointer; outline: none;
}
.be-asb-close, .be-asb-close:focus-visible { outline: none; }
.be-asb-close:focus-visible { box-shadow: 0 0 0 2px var(--beui-ring); }</style>

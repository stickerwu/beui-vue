<script setup lang="ts">
import { useAnimatedSidebar, useAnimatedSidebarPanel } from './context'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ ariaLabel?: string }>()
const emit = defineEmits<{ click: [event: MouseEvent] }>()
const { t, toggleSidebar } = useAnimatedSidebar()
const { side } = useAnimatedSidebarPanel()

function onClick(event: MouseEvent) {
  emit('click', event)
  if (!event.defaultPrevented) toggleSidebar()
}
</script>

<template>
  <button v-bind="$attrs" type="button" class="be-asb-rail" :data-side="side" :aria-label="props.ariaLabel ?? t.toggle" :title="t.toggle" tabindex="-1" @click="onClick" />
</template>

<style>
.be-asb-rail {
  position: absolute; top: 0; bottom: 0; left: 100%; z-index: 20; display: none; width: 1rem; padding: 0; margin: 0;
  border: 0; background: transparent; outline: none; cursor: pointer; transform: translateX(-50%);
}
.be-asb-rail[data-side=right] { left: auto; right: 0; transform: translateX(50%); }
.be-asb-rail::after { content: ''; position: absolute; top: 0; bottom: 0; left: 50%; width: 1px; background: transparent; transition: background-color .15s; }
.be-asb-rail:hover::after { background: var(--beui-border); }
@media (min-width: 768px) { .be-asb-rail { display: block; } }
</style>

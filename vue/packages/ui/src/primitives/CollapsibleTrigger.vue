<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useCollapsible } from './state'

const props = defineProps<{ disabled?: boolean, render?: Component | 'button' }>()
const emit = defineEmits<{ click: [event: MouseEvent] }>()
const { open, disabled, triggerId, contentId, toggle } = useCollapsible()
const unavailable = computed(() => props.disabled || disabled.value)
function activate(event: MouseEvent) {
  emit('click', event)
  if (!event.defaultPrevented && !unavailable.value) toggle()
}
</script>

<template>
  <component :is="render || 'button'" :id="triggerId" type="button" :disabled="unavailable" :aria-expanded="open" :aria-controls="contentId" data-slot="collapsible-trigger" :data-disabled="unavailable || undefined" :data-state="open ? 'open' : 'closed'" :class="{ 'be-collapse-trigger': !render }" @click="activate"><slot /></component>
</template>

<style scoped>
.be-collapse-trigger { display: flex; align-items: center; gap: .75rem; width: 100%; min-height: 2.5rem; padding: .5rem .75rem; border: 0; border-radius: .75rem; background: transparent; color: inherit; text-align: start; font: inherit; font-size: .875rem; font-weight: 500; cursor: pointer; }
.be-collapse-trigger:focus-visible { outline: 2px solid var(--beui-ring); }
.be-collapse-trigger:disabled { pointer-events: none; opacity: .5; }
@media (hover:hover) { .be-collapse-trigger:hover { background: color-mix(in srgb, var(--beui-muted) 60%, transparent); } }
</style>

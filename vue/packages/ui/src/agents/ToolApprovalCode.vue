<script setup lang="ts">
import { computed, useSlots } from 'vue'
import AgentCode from './AgentCode.vue'
const props = withDefaults(defineProps<{ code?: string, language?: string }>(), { language: 'bash' })
const slots = useSlots()
const text = computed(() => props.code ?? (slots.default?.() ?? []).map(node => typeof node.children === 'string' ? node.children : '').join(''))
</script>
<template><AgentCode class="be-tac" :code="text" :language="language" wrap /></template>
<style>
/* Parameter values sit in a narrow grid column with nowhere to scroll on touch, so they wrap. */
.be-tac { box-sizing: border-box; border-radius: 0.5rem; border: 1px solid color-mix(in srgb, var(--beui-border) 50%, transparent); background: color-mix(in srgb, var(--beui-muted) 30%, transparent); padding: 0.5rem 0.625rem; }
</style>

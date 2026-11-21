<script setup lang="ts">
import { computed, useSlots } from 'vue'
import AgentCode from './AgentCode.vue'
const props = withDefaults(defineProps<{ language?: string, code?: string }>(), { language: 'bash' })
const slots = useSlots()
const text = computed(() => props.code ?? (slots.default?.() ?? []).map(node => typeof node.children === 'string' ? node.children : '').join(''))
</script>
<template><AgentCode class="be-tro" :code="text" :language="language" wrap /></template>
<style>
.be-tro { --ag-code-color: color-mix(in srgb, var(--beui-foreground) 80%, transparent); }
</style>

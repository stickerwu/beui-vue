<script setup lang="ts">
import { computed } from 'vue'
import { agentIcons, type AgentIconName } from './icons'
const props = withDefaults(defineProps<{ name: AgentIconName, size?: number | string, strokeWidth?: number | string }>(), { size: 16, strokeWidth: 2 })
const markup = computed(() => agentIcons[props.name])
</script>
<template><svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="flex:none" v-html="markup" /></template>

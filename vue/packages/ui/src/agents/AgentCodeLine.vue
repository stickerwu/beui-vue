<script setup lang="ts">
import { computed } from 'vue'
import './agent-tokens.css'
import { tokenizeLine, type AgentCodeLanguage } from './agent-code'
const props = withDefaults(defineProps<{ code: string, language?: AgentCodeLanguage | string }>(), { language: 'typescript' })
const tokens = computed(() => tokenizeLine(props.code, props.language))
</script>
<template><span><span v-for="(token, index) in tokens" :key="index" class="be-ag-tok" :style="{ '--ag-tok-light': token.light, '--ag-tok-dark': token.dark }">{{ token.content }}</span></span></template>
<style>
.be-ag-tok { color: var(--ag-tok-light); }
:is(.dark, [data-beui-theme="dark"]) .be-ag-tok { color: var(--ag-tok-dark); }
</style>

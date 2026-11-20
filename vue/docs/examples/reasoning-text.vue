<script setup lang="ts">
import { ReasoningText } from 'beui-vue'
const variants = ['cascade','swap','scramble'] as const
const phrases = ['Thinking','Reading the request','Working through the details','Preparing the answer']
</script>
<template><div class="be-agent-demo"><div v-for="variant in variants" :key="variant"><div class="be-agent-muted">{{ variant }}</div><ReasoningText :variant="variant" :phrases="phrases" /></div></div></template>

<script setup lang="ts">
import { AgentProgress } from 'beui-vue'
import { ref } from 'vue'
const running = ref(true)
</script>
<template><div><AgentProgress label="Churning" :initial-seconds="151.6" :running="running" /><button type="button" class="be-agent-button" @click="running = !running">{{ running ? 'Pause' : 'Resume' }}</button></div></template>

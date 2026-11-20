<script setup lang="ts">
import { ButtonBase, ThinkingShimmer } from 'beui-vue'
import { shallowRef } from 'vue'
const paused = shallowRef(false)
</script>
<template><div class="thinking-demo"><ThinkingShimmer :duration="1.8" :paused="paused">Thinking…</ThinkingShimmer><ButtonBase variant="ghost" size="sm" @click="paused = !paused">{{ paused ? 'Play shimmer' : 'Pause shimmer' }}</ButtonBase></div></template>
<style scoped>.thinking-demo { display: grid; justify-items: center; gap: 1.5rem; font-size: 1.125rem; }</style>

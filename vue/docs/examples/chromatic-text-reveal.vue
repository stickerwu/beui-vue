<script setup lang="ts">
import { ButtonBase, ChromaticTextReveal } from 'beui-vue'
import { shallowRef } from 'vue'
const paused = shallowRef(false)
</script>
<template><div class="chrome-demo"><ChromaticTextReveal prefix="Motion that feels" :words="['natural.', 'intentional.', 'alive.']" :start-on-view="false" :paused="paused" /><ButtonBase size="sm" variant="ghost" @click="paused = !paused">{{ paused ? 'Play sequence' : 'Pause sequence' }}</ButtonBase></div></template>
<style scoped>.chrome-demo { container-type: inline-size; width: 100%; display: grid; justify-items: center; gap: 1.5rem; } .chrome-demo > span { font-size: clamp(1.1rem, 7.8cqw, 3rem); letter-spacing: -.04em; line-height: 1.15; font-weight: 500; }</style>

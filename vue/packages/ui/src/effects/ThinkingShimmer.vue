<script setup lang="ts">
import TextShimmer from './TextShimmer.vue'

const { duration = 1.8, labels, paused } = defineProps<{ duration?: number; paused?: boolean; labels?: { thinking?: string } }>()
</script>
<template><TextShimmer class="thinking" :duration="duration" :paused="paused"><slot>{{ labels?.thinking ?? 'Thinking…' }}</slot></TextShimmer></template>
<style scoped>.thinking { font-weight: 500; }</style>

<script setup lang="ts">
import { ButtonBase, TextShimmer } from 'beui-vue'
import { shallowRef } from 'vue'
const paused = shallowRef(false)
</script>
<template>
  <div class="shimmers"><TextShimmer class="large" :paused="paused">Loading projects…</TextShimmer><TextShimmer :duration="1.5" :paused="paused">Faster shimmer</TextShimmer>
    <ButtonBase size="sm" variant="ghost" @click="paused = !paused">{{ paused ? 'Play shimmer' : 'Pause shimmer' }}</ButtonBase>
  </div>
</template>
<style scoped>.shimmers { display: grid; gap: 1rem; justify-items: start; font-size: .875rem; } .large { font-size: 1.875rem; font-weight: 600; line-height: 1.2; }</style>

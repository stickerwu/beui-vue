<script setup lang="ts">
import { TextShimmer } from 'beui-vue'
</script>
<template>
  <div class="shimmers">
    <TextShimmer class="large">Loading projects…</TextShimmer>
    <TextShimmer :duration="1.5" class="small">Faster shimmer</TextShimmer>
  </div>
</template>
<style scoped>
.shimmers { display: flex; flex-direction: column; gap: 1rem; }
.large { font-size: 1.875rem; line-height: 2.25rem; font-weight: 600; }
.small { font-size: .875rem; line-height: 1.25rem; }
</style>

<script setup lang="ts">
import { BeforeAfterSlider } from 'beui-vue'

const photo = 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80'
</script>

<template>
  <div class="comparison-demo">
    <BeforeAfterSlider data-testid="comparison-frame">
      <template #before><img class="photo unedited" :src="photo" width="1200" height="800" alt="Lake house at dawn, unedited" draggable="false" /></template>
      <template #after><img class="photo" :src="photo" width="1200" height="800" alt="Lake house at dawn, color graded" draggable="false" /></template>
    </BeforeAfterSlider>
  </div>
</template>

<style scoped>
.comparison-demo { width: 100%; max-width: 36rem; min-width: 0; margin: 0 auto; }
.photo { display: block; width: 100%; height: 100%; object-fit: cover; } .unedited { filter: brightness(.9) contrast(.75) grayscale(1); }
</style>

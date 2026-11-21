<script setup lang="ts">
import { ChromaticTextReveal } from 'beui-vue'
</script>
<template>
  <!-- The sentence never wraps, so it is sized against the space it actually gets: the surrounding column, not the viewport. -->
  <div class="chrome-demo">
    <ChromaticTextReveal prefix="Motion that feels" :words="['natural.', 'intentional.', 'alive.']" :start-on-view="false" class="chrome" />
  </div>
</template>
<style scoped>
.chrome-demo { container-type: inline-size; display: flex; width: 100%; justify-content: center; }
.chrome { flex-shrink: 0; font-weight: 500; letter-spacing: -.04em; color: var(--beui-foreground); font-size: clamp(1.25rem, 7.8cqw, 3rem); }
</style>

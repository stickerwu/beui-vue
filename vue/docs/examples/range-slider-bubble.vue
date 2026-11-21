<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'

const value = ref(28)
</script>

<template>
  <div class="demo">
    <span class="caption">Drag fast and the bubble leans</span>
    <RangeSlider v-model="value" variant="bubble" aria-label="Value" />
  </div>
</template>

<style scoped>
.demo { display: flex; width: 100%; max-width: 24rem; flex-direction: column; gap: .25rem; }
.caption { font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
</style>

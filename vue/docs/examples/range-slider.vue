<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'

const value = ref(40)
</script>

<template>
  <div class="demo">
    <div class="head">
      <span>Drag the handle</span>
      <span class="readout">{{ value }}</span>
    </div>
    <RangeSlider v-model="value" :step="5" aria-label="Value" />
  </div>
</template>

<style scoped>
.demo { display: flex; width: 100%; max-width: 24rem; flex-direction: column; gap: .75rem; }
.head { display: flex; align-items: center; justify-content: space-between; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.readout { font-variant-numeric: tabular-nums; color: var(--beui-foreground); }
</style>

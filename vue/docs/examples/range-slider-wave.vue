<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'

const value = ref(45)
</script>

<template>
  <div class="demo">
    <div class="head">
      <span>Gain</span>
      <span class="readout">{{ value }}</span>
    </div>
    <RangeSlider v-model="value" variant="wave" aria-label="Gain" />
  </div>
</template>

<style scoped>
.demo { display: flex; width: 100%; max-width: 28rem; flex-direction: column; gap: .5rem; }
.head { display: flex; align-items: center; justify-content: space-between; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.readout { font-variant-numeric: tabular-nums; color: var(--beui-foreground); }
</style>

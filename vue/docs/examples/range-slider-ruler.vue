<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'

const value = ref(72.5)
</script>

<template>
  <div class="demo">
    <RangeSlider v-model="value" variant="ruler" :min="40" :max="120" :step="0.5" :gap="12" :major-every="10" unit="kg" aria-label="Weight" />
  </div>
</template>

<style scoped>
.demo { width: 100%; max-width: 24rem; }
</style>

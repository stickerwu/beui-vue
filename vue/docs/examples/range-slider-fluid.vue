<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'

const value = ref(35)
</script>

<template>
  <div class="demo">
    <RangeSlider v-model="value" variant="fluid" label="Brightness" aria-label="Brightness" />
  </div>
</template>

<style scoped>
.demo { width: 100%; max-width: 24rem; }
</style>

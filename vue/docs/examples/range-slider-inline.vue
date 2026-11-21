<script setup lang="ts">
import { RangeSlider } from 'beui-vue'
</script>

<template>
  <div class="demo">
    <RangeSlider
      variant="inline"
      :default-value="48"
      :min="8"
      :max="128"
      :step="8"
      label="Icon size"
      aria-label="Icon size"
      :format-value-text="value => `${value} pixels`"
    />
  </div>
</template>

<style scoped>
.demo { width: 100%; max-width: 24rem; }
</style>

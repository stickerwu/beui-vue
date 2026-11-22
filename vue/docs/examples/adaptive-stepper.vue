<script setup lang="ts">
import {
  AdaptiveStepper,
  AdaptiveStepperDecrement,
  AdaptiveStepperIncrement,
  AdaptiveStepperValue,
} from 'beui-vue'
</script>

<template>
  <div class="stage">
    <AdaptiveStepper :default-value="2" :min="0" :max="3" aria-label="Guests">
      <AdaptiveStepperDecrement />
      <AdaptiveStepperValue />
      <AdaptiveStepperIncrement />
    </AdaptiveStepper>
  </div>
</template>

<style scoped>
.stage { display: flex; min-height: 320px; width: 100%; align-items: center; justify-content: center; padding: 0 1rem; box-sizing: border-box; }
</style>

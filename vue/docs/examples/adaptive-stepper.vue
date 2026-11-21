<script setup lang="ts">
import { ref } from 'vue'
import { AdaptiveStepper } from 'beui-vue'

const guests = ref(2)
</script>

<template>
  <div class="stage">
    <AdaptiveStepper v-model="guests" :min="0" :max="3" label="Guests" />
  </div>
</template>

<style scoped>
.stage { display: flex; min-height: 320px; width: 100%; align-items: center; justify-content: center; padding: 0 1rem; box-sizing: border-box; }
</style>

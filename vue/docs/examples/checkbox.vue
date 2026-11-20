<script setup lang="ts">
import { Checkbox } from 'beui-vue'
import { ref } from 'vue'
const terms = ref(true)
const updates = ref(false)
</script>
<template>
  <div class="choices">
    <Checkbox v-model="terms" label="Accept terms and conditions" />
    <Checkbox v-model="updates" label="Email me product updates" />
    <Checkbox :model-value="true" indeterminate label="Select all (partial)" />
    <Checkbox :model-value="true" disabled label="Disabled" />
  </div>
</template>
<style scoped>.choices { display: grid; gap: .75rem; }</style>

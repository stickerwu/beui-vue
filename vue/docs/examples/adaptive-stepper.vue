<script setup lang="ts">
import { ref } from 'vue'
import { AdaptiveStepper } from 'beui-vue'
const quantity = ref(1)
</script>
<template><div class="quantity"><label>Quantity</label><AdaptiveStepper v-model="quantity" :min="0" :max="5" /></div></template>
<style scoped>.quantity { display:grid; justify-items:center; gap:.7rem; } label { font-size:.8rem; color:var(--beui-muted-foreground); }</style>

<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'
const value = ref(20)
</script>
<template><RangeSlider v-model="value" variant="inline" label="Exposure" :step="5"/></template>

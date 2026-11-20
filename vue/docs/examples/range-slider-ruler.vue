<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'
const weight = ref(72.5)
</script>
<template><RangeSlider v-model="weight" variant="ruler" :min="40" :max="130" :step=".5" label="Weight" unit="kg"/></template>

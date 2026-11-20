<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'
const value = ref(45)
</script>
<template><RangeSlider v-model="value" variant="wave" label="Gain" :bars="32"/></template>

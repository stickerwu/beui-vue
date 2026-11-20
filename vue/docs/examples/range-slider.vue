<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'
const value = ref(35)
</script>
<template><RangeSlider v-model="value" label="音量" :step="5"/><output>{{ value }}</output></template>

<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'
const value = ref(64)
</script>
<template><RangeSlider v-model="value" variant="fluid" label="Volume"/></template>

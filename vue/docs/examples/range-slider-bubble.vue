<script setup lang="ts">
import { ref } from 'vue'
import { RangeSlider } from 'beui-vue'
const value = ref(55)
</script>
<template><RangeSlider v-model="value" variant="bubble" label="Opacity" :format="value=>`${value}%`"/></template>

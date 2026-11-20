<script setup lang="ts">
import { MetallicButton } from 'beui-vue'
import { ref } from 'vue'
const paused = ref(false)
</script>
<template><MetallicButton :paused="paused" @click="paused = !paused">{{ paused ? 'Play reflection' : 'Pause reflection' }}</MetallicButton></template>

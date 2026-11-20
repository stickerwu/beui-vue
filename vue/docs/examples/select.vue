<script setup lang="ts">
import { Select } from 'beui-vue'
import { ref } from 'vue'
const framework = ref('next')
const options = [{ value: 'next', label: 'Next.js' }, { value: 'remix', label: 'Remix' }, { value: 'astro', label: 'Astro' }, { value: 'vite', label: 'Vite' }]
</script>
<template><Select v-model="framework" class="framework" :options="options" label="Pick a framework" /></template>
<style scoped>.framework { max-width: 14rem; }</style>

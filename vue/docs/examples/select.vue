<script setup lang="ts">
import { Select } from 'beui-vue'
import { ref } from 'vue'
const framework = ref('next')
const options = [{ value: 'next', label: 'Next.js' }, { value: 'remix', label: 'Remix' }, { value: 'astro', label: 'Astro' }, { value: 'vite', label: 'Vite' }]
</script>
<template><div class="framework"><Select v-model="framework" :options="options" placeholder="Pick a framework" /></div></template>
<style scoped>.framework { width: 14rem; }</style>

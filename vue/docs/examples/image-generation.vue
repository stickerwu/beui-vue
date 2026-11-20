<script setup lang="ts">
import { ImageGeneration } from 'beui-vue'
import { ref } from 'vue'
const states = ['queued','generating','refining','complete','error'] as const
const status = ref<typeof states[number]>('generating')
</script>
<template><div class="be-agent-demo"><ImageGeneration :status="status" resolution="1024 × 1024" prompt="A lakeside cabin beneath the mountains" @retry="status = 'generating'"><img src="https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&amp;fit=crop&amp;w=600&amp;q=80" alt="A lakeside cabin beneath the mountains" /></ImageGeneration><label>Generation stage <select v-model="status"><option v-for="state in states" :key="state">{{ state }}</option></select></label></div></template>

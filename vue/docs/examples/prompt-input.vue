<script setup lang="ts">
import { PromptInput } from 'beui-vue'
import { ref } from 'vue'
const report = ref('')
const models = [{ value: 'fast', label: 'Fast' }, { value: 'reasoning', label: 'Reasoning' }]
const actions = [{ value: 'context', label: 'Attach context', description: 'Include notes in the next prompt' }]
</script>
<template>
  <div class="be-agent-demo"><PromptInput :models="models" :actions="actions" @submit="(value, model) => report = `${model} · ${value}`" @action="report = 'Context attached'" /><output role="status">{{ report }}</output></div>
</template>

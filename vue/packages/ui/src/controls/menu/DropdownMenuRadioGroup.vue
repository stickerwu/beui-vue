<script setup lang="ts">
import { computed, provide } from 'vue'
import { radioKey } from './menu-shared'

const props = defineProps<{ value: string }>()
const emit = defineEmits<{ 'update:value': [value: string]; valueChange: [value: string] }>()
provide(radioKey, {
  value: computed(() => props.value),
  select(next) { emit('update:value', next); emit('valueChange', next) },
})
</script>

<template><div><slot /></div></template>

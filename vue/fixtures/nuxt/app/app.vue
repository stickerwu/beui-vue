<script setup lang="ts">
import { ButtonBase } from 'beui-vue'

const count = ref(0)
const ready = ref(false)
onMounted(() => { ready.value = true })
</script>

<template>
  <main :data-ready="ready"><ButtonBase @click="count++">Packed count {{ count }}</ButtonBase></main>
</template>

<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'

const ready = shallowRef(false)
onMounted(() => { ready.value = true })
</script>

<template>
  <div class="beui-demo" :data-ready="ready"><slot /></div>
</template>

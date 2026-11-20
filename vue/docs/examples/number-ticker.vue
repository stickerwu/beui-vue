<script setup lang="ts">
import { ref } from 'vue'
import { NumberTicker } from 'beui-vue'
const total = ref(1234.56)
</script>
<template><button @click="total+=81.25"><NumberTicker :value="total" prefix="¥" :decimals="2" locale="zh-CN"/></button></template>

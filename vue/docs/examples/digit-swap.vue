<script setup lang="ts">
import { ref } from 'vue'
import { DigitSwap } from 'beui-vue'
const count = ref(42)
</script>
<template><button @click="count++">增加 <DigitSwap :value="count"/></button></template>

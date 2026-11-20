<script setup lang="ts">
import { ref } from 'vue'
import { AnimatedNumber } from 'beui-vue'
const views = ref(1240)
</script>
<template><button @click="views+=420">访问量 <AnimatedNumber :value="views"/></button></template>

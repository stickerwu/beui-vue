<script setup lang="ts">
import { ref } from 'vue'
import { AnimatedBadge } from 'beui-vue'
const complete = ref(false)
</script>
<template><button @click="complete=!complete"><AnimatedBadge :status="complete?'success':'loading'">{{ complete?'已完成':'处理中' }}</AnimatedBadge></button></template>

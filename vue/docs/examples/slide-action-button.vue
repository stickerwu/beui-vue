<script setup lang="ts">
import { ref } from 'vue'
import { SlideActionButton } from 'beui-vue'
const count = ref(0)
</script>
<template><SlideActionButton label="滑动以确认" complete-label="已确认" @complete="count++"/><output>{{ count }} 次确认</output></template>

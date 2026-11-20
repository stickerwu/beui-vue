<script setup lang="ts">
import { ref } from 'vue'
import { BloomMenu } from 'beui-vue'
const selected = ref('')
</script>
<template><div><BloomMenu @select="selected=$event" /><output>{{ selected }}</output></div></template>

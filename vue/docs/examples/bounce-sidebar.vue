<script setup lang="ts">
import { ref } from 'vue'
import { BounceSidebar } from 'beui-vue'
const active = ref('overview')
const items = ['Overview','Components','Motion','Templates','Changelog'].map(label => ({ id:label.toLowerCase(),label }))
</script>
<template><BounceSidebar v-model="active" :items="items" label="Explore beUI" /></template>

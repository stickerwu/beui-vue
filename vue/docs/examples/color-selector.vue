<script setup lang="ts">
import { ColorSelector } from 'beui-vue'
import { ref } from 'vue'
const accent = ref('Blue')
const names = ['Blue','Purple','Pink','Red','Orange','Amber','Green','Teal']
const colors = ['#3478f6','#9270e8','#e66aa4','#e55656','#ed9141','#e5b63c','#65a65a','#169d83']
const options = names.map((label, index) => ({ value: label, label, color: colors[index] }))
</script>
<template><ColorSelector v-model="accent" :options="options" label="Accent" name="accent" /></template>

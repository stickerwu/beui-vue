<script setup lang="ts">
import { CardFolder } from 'beui-vue'
const sampleDigits = Array.from({length:16},(_,index) => String(index % 10)).join('')
</script>
<template><CardFolder title="Demo card" :card-number="sampleDigits" expiry="12/30" cvv="000" /></template>

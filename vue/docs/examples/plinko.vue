<script setup lang="ts">
import { ref } from 'vue'
import { Plinko, plinkoSlots } from 'beui-vue'

const slots = plinkoSlots(8, { center: 1, edge: 20 })
const landed = ref('Drop a ball to start.')
function land(slot: number, value: string | number) { landed.value = `Slot ${slot + 1} · ${value}×` }
</script>

<template><div><Plinko :slots="slots" :max-balls="4" @land="land" /><p>{{ landed }}</p></div></template>

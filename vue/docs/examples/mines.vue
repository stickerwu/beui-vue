<script setup lang="ts">
import { ref } from 'vue'
import { Mines } from 'beui-vue'

const count = ref(3)
const message = ref('Find a gem and cash out.')
let seed = 77
function seeded() {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
  return seed / 2 ** 32
}
function result(value: number, gems: number) { message.value = `${gems} gems at ${value.toFixed(2)}×` }
</script>

<template><div><Mines v-model:mines="count" :random="seeded" @cash-out="result" /><p>{{ message }}</p></div></template>

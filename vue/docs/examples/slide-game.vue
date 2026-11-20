<script setup lang="ts">
import { ref } from 'vue'
import { SlideGame } from 'beui-vue'

const bet = ref(5)
const target = ref(2)
const values = [2.64, 1.32, 3.18, 1.07]
const receipt = ref('Demo credits')
let next = 0
async function getResult() { return values[next++ % values.length] }
function settled(result: number, goal: number, stake: number) {
  receipt.value = `${stake} credits · ${result.toFixed(2)}× ${result >= goal ? 'won' : 'missed'}`
}
</script>

<template><div><SlideGame v-model:target="target" v-model:bet="bet" :get-result="getResult" currency="¤" :duration="1.8" @result="settled" /><p>{{ receipt }}</p></div></template>

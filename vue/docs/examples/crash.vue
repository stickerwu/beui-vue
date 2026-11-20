<script setup lang="ts">
import { ref } from 'vue'
import { Crash } from 'beui-vue'

const points = [1.52, 1.06, 2.12, 1.18]
let round = 0
const message = ref('Local rounds')
async function nextPoint() { return points[round++ % points.length] }
function finish(point: number, payout: number | null) {
  message.value = `Ended at ${point.toFixed(2)}× · ${payout === null ? 'no cash out' : `cashed at ${payout.toFixed(2)}×`}`
}
</script>

<template><div><Crash :get-crash-point="nextPoint" :default-auto-cash-out="1.5" @crash="finish" /><p>{{ message }}</p></div></template>

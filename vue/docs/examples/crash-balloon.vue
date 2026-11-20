<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { CrashBalloon, type CrashReveal } from 'beui-vue'

const reveal = ref<CrashReveal | null>(null)
const receipt = ref('Waiting for a round')
let timer: ReturnType<typeof setTimeout> | undefined
function start(round: number) {
  reveal.value = null
  receipt.value = 'Waiting for reveal'
  timer = setTimeout(() => { reveal.value = { round, value: 1.27 } }, 1600)
}
function confirm(value: number) { receipt.value = `Confirmed ${value.toFixed(2)}×` }
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template><div><CrashBalloon :crash-at="reveal" @start="start" @cash-out="confirm" /><p>{{ receipt }}</p></div></template>

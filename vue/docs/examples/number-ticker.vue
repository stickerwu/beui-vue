<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { NumberTicker } from 'beui-vue'

const value = ref(48273)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { value.value += Math.floor(Math.random() * 50) }, 2500) })
onBeforeUnmount(() => clearInterval(timer))
const format = (n: number) => n.toLocaleString('en-US')
</script>

<template>
  <div class="ticker-demo">
    <p>Active users</p>
    <NumberTicker :value="value" prefix="" class-name="ticker-value" :format="format" />
    <p>live · updates every 2.5s</p>
  </div>
</template>

<style scoped>
.ticker-demo { display: flex; flex-direction: column; align-items: center; gap: .75rem; }
p { margin: 0; font-size: .75rem; line-height: 1rem; color: var(--beui-muted-foreground); }
:deep(.ticker-value) { font-size: 2.25rem; line-height: 2.5rem; font-weight: 600; letter-spacing: -.025em; color: var(--beui-foreground); font-variant-numeric: tabular-nums; }
</style>

<script setup lang="ts">
import { SlideGame } from 'beui-vue'
import { computed, shallowRef } from 'vue'

const profit = shallowRef(0)
const label = computed(() => `${profit.value >= 0 ? '+' : '−'}$${Math.abs(profit.value).toFixed(2)}`)
function settled(result: number, target: number, bet: number) {
  profit.value += result >= target ? bet * (target - 1) : -bet
}
</script>

<template>
  <div class="slide-demo">
    <p class="slide-demo-profit">Session profit <span>{{ label }}</span></p>
    <SlideGame @result="settled" />
  </div>
</template>

<style scoped>
.slide-demo { display: flex; width: 100%; max-width: 48rem; flex-direction: column; align-items: center; gap: .75rem; }
.slide-demo-profit { margin: 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); font-variant-numeric: tabular-nums; }
.slide-demo-profit span { font-weight: 500; color: var(--beui-foreground); }
</style>

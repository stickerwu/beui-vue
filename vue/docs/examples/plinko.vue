<script setup lang="ts">
import { Plinko, Tabs } from 'beui-vue'
import { shallowRef } from 'vue'

const rowCounts = ['8', '12', '16'].map(count => ({ value: count, label: `${count} rows` }))
const rows = shallowRef('12')
const score = shallowRef(0)
const drops = shallowRef(0)
function land(_slot: number, value: string | number) {
  score.value += Number(value)
  drops.value++
}
</script>

<template>
  <div class="plinko-demo">
    <Tabs v-model="rows" :items="rowCounts" variant="pill" :labels="{ list: 'Rows' }" />
    <p class="score">Score <span>{{ score }}</span> · {{ drops }} {{ drops === 1 ? 'ball' : 'balls' }}</p>
    <Plinko :rows="Number(rows)" @land="land" />
  </div>
</template>

<style scoped>
.plinko-demo { display: flex; width: 100%; max-width: 36rem; flex-direction: column; align-items: center; gap: .75rem; }
.score { margin: 0; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); font-variant-numeric: tabular-nums; }
.score span { font-weight: 500; color: var(--beui-foreground); }
</style>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { FunnelChart } from 'beui-vue'

const direction = shallowRef<'vertical' | 'horizontal'>('vertical')
const labels = ['Visitors', 'Signed up', 'Activated', 'Started trial', 'Subscribed']
const cohorts = [[24000, 15600, 10800, 7200, 4320], [28000, 18200, 13650, 9100, 6370], [22000, 13200, 7920, 4752, 2376]]
const cohort = shallowRef(0)
const stages = computed(() => labels.map((label, index) => ({ id: label, label, value: cohorts[cohort.value][index] })))
</script>

<template>
  <div class="chart-demo"><header><div><strong>From first visit to first payment</strong><p>Product conversion · Sample cohorts</p></div><button type="button" @click="cohort = (cohort + 1) % cohorts.length">Next cohort</button></header>
    <fieldset aria-label="Funnel direction"><button type="button" :aria-pressed="direction === 'vertical'" @click="direction = 'vertical'">Vertical</button><button type="button" :aria-pressed="direction === 'horizontal'" @click="direction = 'horizontal'">Horizontal</button></fieldset>
    <FunnelChart :stages="stages" :direction="direction" />
    <footer>Inspect a stage to see conversion and drop-off</footer>
  </div>
</template>
<style scoped src="./chart-demo.css"></style>
<style scoped>fieldset { display: inline-flex; border: none; margin: 0 0 24px; padding: 4px; border-radius: 24px; background: var(--beui-card); }</style>

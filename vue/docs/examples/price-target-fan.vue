<script setup lang="ts">
import { PriceTargetFan } from 'beui-vue'

const history = Array.from({ length: 30 }, (_, index) => ({ date: new Date(Date.UTC(2026, 9, index + 1)).toISOString().slice(0, 10), price: 92 + index * .25 + Math.sin(index * .6) * 1.5 }))
const targets = [{ key: 'High', price: 123, analysts: 4 }, { key: 'Mean', price: 111, analysts: 12 }, { key: 'Low', price: 87, analysts: 3 }] as const
</script>

<template><PriceTargetFan label="Analyst price targets" :current="100" :history="history" :targets="targets" :dates="{ start: 'Oct 2026', mid: 'Today', horizon: 'Oct 2027' }" /></template>

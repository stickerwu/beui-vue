<script setup lang="ts">
import { PriceTargetFan } from 'beui-vue'

const history = [158.4, 164.2, 160.8, 173.1, 170.6, 181.3, 175.8, 183.7, 178.2, 184.1, 180.5, 177.3, 178.52].map((price, month) => ({
  date: new Date(Date.UTC(2025, 8 + month, 14)).toISOString().slice(0, 10), price,
}))
const targets = [{ key: 'High', price: 232, analysts: 9 }, { key: 'Mean', price: 205, analysts: 34 }, { key: 'Low', price: 168, analysts: 6 }] as const
</script>

<template><PriceTargetFan :current="178.52" :history="history" :targets="targets" :dates="{ horizon: 'Sep 2027' }" /></template>

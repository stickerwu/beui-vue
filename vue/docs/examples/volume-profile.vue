<script setup lang="ts">
import { shallowRef } from 'vue'
import { VolumeProfile } from 'beui-vue'

const showArea = shallowRef(true)
const data = [12, 20, 37, 55, 89, 93, 72, 48, 25, 14].map((volume, index) => ({ id: `price-${index}`, priceLow: 100 + index, priceHigh: 101 + index, volume }))
</script>

<template><div style="width: 100%"><label><input v-model="showArea" type="checkbox"> Show 70% value area</label><VolumeProfile label="Traded volume" unit="shares" :data="data" :value-area="showArea ? 0.7 : false" /></div></template>

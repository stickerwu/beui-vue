<script setup lang="ts">
import { DateRangePicker, type DateRange } from 'beui-vue'
import { ref } from 'vue'
const range = ref<DateRange | null>({ from: '2026-10-12', to: '2026-10-18' })
</script>
<template><DateRangePicker v-model="range" label="Reporting period" default-month="2026-10-18" max="2026-10-31" /></template>

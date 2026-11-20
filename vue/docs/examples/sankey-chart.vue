<script setup lang="ts">
import { SankeyChart } from 'beui-vue'

const nodes = [{ id: 'search', label: 'Search' }, { id: 'referrals', label: 'Referrals' }, { id: 'trial', label: 'Trial' }, { id: 'paid', label: 'Paid' }, { id: 'churn', label: 'Churn' }]
const links = [{ source: 'search', target: 'trial', value: 120 }, { source: 'referrals', target: 'trial', value: 80 }, { source: 'trial', target: 'paid', value: 146 }, { source: 'trial', target: 'churn', value: 54 }]
</script>

<template><SankeyChart label="Customer journey" :nodes="nodes" :links="links" /></template>

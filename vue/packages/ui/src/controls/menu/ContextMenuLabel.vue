<script setup lang="ts">
import './menu.css'
defineProps<{ inset?: boolean }>()
</script>

<template><div class="be-ctx-label" :data-inset="inset ? '' : undefined"><slot /></div></template>

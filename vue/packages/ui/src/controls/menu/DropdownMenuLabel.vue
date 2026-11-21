<script setup lang="ts">
import './menu.css'
defineProps<{ inset?: boolean }>()
</script>

<template><div class="be-menu-label" :data-inset="inset ? '' : undefined"><slot /></div></template>

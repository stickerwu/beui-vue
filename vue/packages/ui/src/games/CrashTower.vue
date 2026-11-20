<script setup lang="ts">
import CrashGame from './CrashGame.vue'
import type { CrashProps } from './crash-round'
withDefaults(defineProps<CrashProps>(), { sound: undefined })
</script>

<template><CrashGame v-bind="$props" design="tower" /></template>

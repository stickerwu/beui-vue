<script setup lang="ts">
import { gameIcons, type GameIconName } from './game-icons'
const { name, size = 16, strokeWidth = 2 } = defineProps<{ name: GameIconName; size?: number | string; strokeWidth?: number }>()
</script>
<template>
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" v-html="gameIcons[name]" />
</template>

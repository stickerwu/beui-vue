<script setup lang="ts">
import { KnockoutBracket } from 'beui-vue'
import { BRACKET_ROUNDS, THIRD_PLACE } from './tournament-data'
</script>

<template>
  <div class="bracket-stage"><KnockoutBracket :rounds="BRACKET_ROUNDS" :third-place="THIRD_PLACE" /></div>
</template>

<style scoped>
.bracket-stage { width: 100%; padding-block: 2rem; }
</style>

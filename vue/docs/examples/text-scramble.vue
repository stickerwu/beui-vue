<script setup lang="ts">
import { ButtonBase, TextScramble } from 'beui-vue'
import { shallowRef } from 'vue'
const phrases = ['Inspecting the repository', 'Running the checks', 'Preparing the update']
const index = shallowRef(0)
</script>
<template>
  <div class="scramble-demo"><TextScramble :text="phrases[index]!" /><ButtonBase variant="secondary" size="sm" @click="index = (index + 1) % phrases.length">Next phrase</ButtonBase></div>
</template>
<style scoped>.scramble-demo { display: grid; justify-items: center; gap: 2rem; } .scramble-demo > span { font: 500 clamp(.92rem, 4vw, 1.25rem)/1.3 ui-monospace, monospace; }</style>

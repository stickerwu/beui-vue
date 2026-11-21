<script setup lang="ts">
import { ButtonBase, TextScramble } from 'beui-vue'
import { shallowRef } from 'vue'
const phrases = ['Inspecting the repository', 'Running the checks', 'Preparing the update']
const index = shallowRef(0)
</script>
<template>
  <div class="scramble-demo">
    <TextScramble :text="phrases[index]!" class="phrase" />
    <ButtonBase variant="secondary" class="next" @click="index = (index + 1) % phrases.length">Next phrase</ButtonBase>
  </div>
</template>
<style scoped>
.scramble-demo { display: flex; width: 100%; flex-direction: column; align-items: center; gap: 2rem; text-align: center; }
.phrase { font-family: var(--font-mono, 'Geist Mono Variable', ui-monospace, monospace); font-size: 1.25rem; line-height: 1.75rem; font-weight: 500; color: var(--beui-foreground); }
.next { height: 2.25rem; padding: 0 1rem; font-size: .75rem; }
</style>

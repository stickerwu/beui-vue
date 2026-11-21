<script setup lang="ts">
import { ButtonBase, TextReveal } from 'beui-vue'
import { shallowRef } from 'vue'
const replay = shallowRef(0)
</script>
<template>
  <div class="reveal-demo">
    <div :key="replay" class="stack">
      <TextReveal as="h2" :text="['Motion that feels', 'considered.']" class="title" />
      <TextReveal text="Word by word, with a soft blur." :delay=".9" :stagger=".05" :blur="6" y-offset="20%" class="subtitle" />
    </div>
    <ButtonBase variant="secondary" class="replay" @click="replay++">Replay</ButtonBase>
  </div>
</template>
<style scoped>
.reveal-demo { display: flex; width: 100%; flex-direction: column; align-items: center; gap: 2rem; text-align: center; }
.stack { display: flex; flex-direction: column; gap: .5rem; }
.title { margin: 0; padding: 0; border: 0; font-size: clamp(2.25rem, 6vw, 3rem); line-height: .95; font-weight: 600; letter-spacing: -.04em; color: var(--beui-foreground); text-wrap: balance; }
.subtitle { font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.replay { height: 2.25rem; padding: 0 1rem; font-size: .75rem; }
</style>

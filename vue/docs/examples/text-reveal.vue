<script setup lang="ts">
import { ButtonBase, TextReveal } from 'beui-vue'
import { shallowRef } from 'vue'
const replay = shallowRef(0)
</script>
<template>
  <div class="reveal-demo"><div :key="replay">
    <TextReveal as="h2" :text="['Motion that feels', 'considered.']" class="title" />
    <TextReveal text="Word by word, with a soft blur." :delay=".9" :stagger=".05" :blur="6" y-offset="20%" class="subtitle" />
  </div><ButtonBase variant="secondary" size="sm" @click="replay++">Replay</ButtonBase></div>
</template>
<style scoped>.reveal-demo { text-align: center; display: grid; justify-items: center; gap: 2rem; } .title { font-size: clamp(2rem, 6vw, 3rem); line-height: .95; font-weight: 600; letter-spacing: -.04em; border: 0; margin: 0; padding: 0; } .subtitle { margin-top: .75rem; font-size: .875rem; color: var(--beui-muted-foreground); }</style>

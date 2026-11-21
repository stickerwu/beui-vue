<script setup lang="ts">
import { ScrollReveal } from 'beui-vue'
import { useTemplateRef } from 'vue'
// On a page <ScrollReveal> tracks the viewport. Here `root` points at the box so each card reveals as it scrolls into the contained view.
const region = useTemplateRef('region')
const cards = ['Spring slide', 'Blur in', 'Staggered by delay', 'Reveal once']
</script>
<template>
  <div ref="region" class="reveal-frame" role="region" aria-label="Scroll reveals" tabindex="0">
    <div class="cards">
      <div class="hint">Scroll ↓</div>
      <ScrollReveal v-for="(name, index) in cards" :key="name" class="card" :root="region" :once="false" :delay="index * .05">{{ name }}</ScrollReveal>
      <div class="hint">End</div>
    </div>
  </div>
</template>
<style scoped>
.reveal-frame { box-sizing: border-box; height: 20rem; width: 100%; max-width: 32rem; overflow-y: auto; scrollbar-width: none; border-radius: 1rem; border: 1px solid var(--beui-border); background: var(--beui-card); }
.reveal-frame::-webkit-scrollbar { display: none; }
.cards { display: flex; flex-direction: column; gap: 4rem; padding: 1.5rem; }
.hint { text-align: center; font-size: .875rem; line-height: 1.25rem; color: var(--beui-muted-foreground); }
.card { border-radius: .75rem; border: 1px solid var(--beui-border); background: color-mix(in srgb, var(--beui-muted) 50%, transparent); padding: 4rem 1rem; text-align: center; font-size: 1rem; line-height: 1.5rem; font-weight: 500; color: var(--beui-foreground); }
</style>

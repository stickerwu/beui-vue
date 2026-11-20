<script setup lang="ts">
import { ScrollReveal } from 'beui-vue'
import { useTemplateRef } from 'vue'
const region = useTemplateRef('region')
const cards = ['Spring slide', 'Blur in', 'Staggered by delay', 'Reveal once']
</script>
<template>
  <div ref="region" class="reveal-frame" role="region" aria-label="Scroll reveals" tabindex="0"><div class="cards">
    <span>Scroll ↓</span><ScrollReveal v-for="(name, index) in cards" :key="name" class="card" :root="region" :once="false" :delay="index * .05">{{ name }}</ScrollReveal><span>End</span>
  </div></div>
</template>
<style scoped>.reveal-frame { height: 20rem; width: 100%; max-width: 32rem; overflow: auto; border-radius: 1rem; border: 1px solid var(--beui-border); background: var(--beui-card); } .cards { display: grid; gap: 4rem; padding: 1.5rem; color: var(--beui-muted-foreground); text-align: center; font-size: .875rem; } .card { border-radius: .75rem; border: 1px solid var(--beui-border); background: var(--beui-muted); padding: 4rem 1rem; color: var(--beui-foreground); font-size: 1rem; font-weight: 500; }</style>

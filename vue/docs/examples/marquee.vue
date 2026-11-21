<script setup lang="ts">
import { Marquee } from 'beui-vue'
const logos = ['Vercel', 'Linear', 'Stripe', 'Figma', 'GitHub', 'Notion', 'Loom', 'Raycast']
</script>
<template>
  <div class="marquee-demo">
    <Marquee :speed="25"><div v-for="logo in logos" :key="logo" class="logo">{{ logo }}</div></Marquee>
  </div>
</template>
<style scoped>
.marquee-demo { width: 100%; min-width: 0; }
.logo { display: flex; align-items: center; justify-content: center; margin-inline: 1rem; padding-inline: 1.5rem; height: 3rem; background: var(--beui-card); border: 1px solid var(--beui-border); border-radius: .5rem; font-size: .875rem; line-height: 1.25rem; font-weight: 500; color: var(--beui-foreground); }
</style>

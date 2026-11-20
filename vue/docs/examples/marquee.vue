<script setup lang="ts">
import { ButtonBase, Marquee } from 'beui-vue'
import { shallowRef } from 'vue'
const logos = ['Vercel', 'Linear', 'Stripe', 'Figma', 'GitHub', 'Notion', 'Loom', 'Raycast']
const paused = shallowRef(false)
</script>
<template><div class="marquee-demo"><Marquee :speed="25" :paused="paused"><span v-for="logo in logos" :key="logo" class="logo">{{ logo }}</span></Marquee><ButtonBase variant="ghost" size="sm" @click="paused = !paused">{{ paused ? 'Play marquee' : 'Pause marquee' }}</ButtonBase></div></template>
<style scoped>.marquee-demo { width: 100%; min-width: 0; text-align: center; } .logo { display: grid; place-items: center; margin-inline: 1rem; padding-inline: 1.5rem; height: 3rem; background: var(--beui-card); border: 1px solid var(--beui-border); border-radius: .5rem; font-size: .875rem; font-weight: 500; } .marquee-demo button { margin-top: 1rem; }</style>
